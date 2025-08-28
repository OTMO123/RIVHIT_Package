/**
 * NetworkDetectionService - Automatic network discovery for printer scanning
 */

import * as os from 'os';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

export interface NetworkInterface {
  name: string;
  ip: string;
  network: string;
}

export interface NetworkInfo {
  currentNetwork: string;
  gateway: string;
  subnet: string;
  interfaces: NetworkInterface[];
  suggestedRanges: string[];
}

export class NetworkDetectionService {
  private readonly POPULAR_PRINTER_IPS = [1, 100, 101, 150, 200, 201, 250, 254];
  private readonly PRIVATE_NETWORKS = ['192.168', '10.', '172.16', '172.17', '172.18', '172.19', '172.20'];
  
  /**
   * Detect current network information from system
   */
  async detectNetworkInfo(): Promise<NetworkInfo> {
    try {
      const [routeInfo, interfaceInfo] = await Promise.all([
        this.getRouteInfo(),
        this.getInterfaceInfo()
      ]);
      
      return this.parseNetworkOutput(routeInfo, interfaceInfo);
    } catch (error) {
      console.warn('Failed to detect system network info, using defaults:', error);
      return this.getDefaultNetworkInfo();
    }
  }

  /**
   * Generate smart IP suggestions for printer discovery
   */
  async suggestPrinterIPs(): Promise<string[]> {
    const networkInfo = await this.detectNetworkInfo();
    const suggestions = new Set<string>();

    // Add suggestions from detected networks
    for (const range of networkInfo.suggestedRanges) {
      for (const ending of this.POPULAR_PRINTER_IPS) {
        suggestions.add(`${range}.${ending}`);
      }
    }

    // Add RIVHIT-specific IPs with leading zeros
    suggestions.add('192.168.014.200');
    suggestions.add('192.168.001.200');
    suggestions.add('192.168.000.200');

    // Sort by priority (current network first, then popular ranges)
    return Array.from(suggestions).sort((a, b) => {
      if (a.startsWith(networkInfo.currentNetwork)) return -1;
      if (b.startsWith(networkInfo.currentNetwork)) return 1;
      if (a.includes('.200')) return -1;
      if (b.includes('.200')) return 1;
      return a.localeCompare(b);
    });
  }

  /**
   * Parse network output from system commands
   */
  parseNetworkOutput(routeOutput: string, interfaceOutput: string): NetworkInfo {
    try {
      const gateway = this.extractGateway(routeOutput);
      const interfaces = this.parseInterfaces(interfaceOutput);
      const currentNetwork = gateway ? this.getNetworkPrefix(gateway) : 
                            interfaces.length > 0 ? interfaces[0].network : '192.168.1';
      
      const suggestedRanges = this.generateSuggestedRanges(interfaces, currentNetwork);

      return {
        currentNetwork,
        gateway: gateway || `${currentNetwork}.1`,
        subnet: '255.255.255.0',
        interfaces,
        suggestedRanges
      };
    } catch (error) {
      return this.getDefaultNetworkInfo();
    }
  }

  /**
   * Extract network prefix from IP address (192.168.1.100 -> 192.168.1)
   */
  getNetworkPrefix(ip: string): string {
    const parts = ip.split('.');
    return `${parts[0]}.${parts[1]}.${parts[2]}`;
  }

  /**
   * Check if network is in private range
   */
  isPrivateNetwork(networkPrefix: string): boolean {
    return this.PRIVATE_NETWORKS.some(range => networkPrefix.startsWith(range));
  }

  /**
   * Get default network information when detection fails
   */
  getDefaultNetworkInfo(): NetworkInfo {
    return {
      currentNetwork: '192.168.1',
      gateway: '192.168.1.1',
      subnet: '255.255.255.0',
      interfaces: [],
      suggestedRanges: ['192.168.1', '192.168.14', '192.168.0', '10.0.0', '172.16.0']
    };
  }

  private async getRouteInfo(): Promise<string> {
    try {
      // Try Linux/macOS route commands
      const commands = [
        'ip route | grep default',
        'route -n get default',
        'netstat -rn | grep default'
      ];

      for (const command of commands) {
        try {
          const { stdout } = await execAsync(command);
          if (stdout.trim()) {
            return stdout;
          }
        } catch (error) {
          continue;
        }
      }
      
      return '';
    } catch (error) {
      return '';
    }
  }

  private async getInterfaceInfo(): Promise<string> {
    try {
      // Try different interface info commands
      const commands = [
        'ip addr show',
        'ifconfig',
        'ipconfig /all'
      ];

      for (const command of commands) {
        try {
          const { stdout } = await execAsync(command);
          if (stdout.trim()) {
            return stdout;
          }
        } catch (error) {
          continue;
        }
      }

      // Fallback to Node.js os module
      return this.getNodeNetworkInfo();
    } catch (error) {
      return this.getNodeNetworkInfo();
    }
  }

  private getNodeNetworkInfo(): string {
    try {
      const interfaces = os.networkInterfaces();
      if (!interfaces) {
        return '';
      }
      
      let output = '';

      for (const [name, details] of Object.entries(interfaces)) {
        if (details) {
          for (const detail of details) {
            if (!detail.internal && detail.family === 'IPv4') {
              output += `${name}: inet ${detail.address} netmask ${detail.netmask}\n`;
            }
          }
        }
      }

      return output;
    } catch (error) {
      return '';
    }
  }

  private extractGateway(routeOutput: string): string {
    // Parse various route output formats
    const patterns = [
      /default via (\d+\.\d+\.\d+\.\d+)/,  // Linux: default via 192.168.1.1
      /default: (\d+\.\d+\.\d+\.\d+)/,     // macOS: default: 192.168.1.1
      /0\.0\.0\.0\s+(\d+\.\d+\.\d+\.\d+)/, // Windows: 0.0.0.0 192.168.1.1
    ];

    for (const pattern of patterns) {
      const match = routeOutput.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return '';
  }

  private parseInterfaces(interfaceOutput: string): NetworkInterface[] {
    const interfaces: NetworkInterface[] = [];
    const lines = interfaceOutput.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Look for lines with format: interfaceName: inet IP_ADDRESS
      const interfaceMatch = trimmedLine.match(/^(\w+):\s*inet\s+(\d+\.\d+\.\d+\.\d+)/);
      
      if (interfaceMatch) {
        const interfaceName = interfaceMatch[1];
        const ip = interfaceMatch[2];
        
        // Skip loopback and localhost IPs
        if (interfaceName !== 'lo' && !ip.startsWith('127.')) {
          const network = this.getNetworkPrefix(ip);
          
          if (this.isPrivateNetwork(network)) {
            interfaces.push({
              name: interfaceName,
              ip,
              network
            });
          }
        }
      }
    }

    return interfaces;
  }

  private generateSuggestedRanges(interfaces: NetworkInterface[], currentNetwork: string): string[] {
    const ranges = new Set<string>();
    
    // Add current network first
    ranges.add(currentNetwork);
    
    // Add detected interface networks
    interfaces.forEach(iface => ranges.add(iface.network));
    
    // Add popular networks
    const popularNetworks = ['192.168.14', '192.168.1', '192.168.0', '10.0.0', '172.16.0'];
    popularNetworks.forEach(network => ranges.add(network));

    return Array.from(ranges);
  }
}