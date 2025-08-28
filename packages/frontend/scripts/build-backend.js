const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

const BACKEND_SOURCE = path.resolve(__dirname, '../../backend');
const BACKEND_DEST = path.resolve(__dirname, '../resources/backend');

async function buildBackend() {
  console.log('🔨 Building backend for production...\n');

  try {
    // Step 1: Clean destination directory
    console.log('📦 Cleaning destination directory...');
    await fs.remove(BACKEND_DEST);
    await fs.ensureDir(BACKEND_DEST);

    // Step 2: Build backend TypeScript
    console.log('🔨 Building backend TypeScript...');
    execSync('npm run build', {
      cwd: BACKEND_SOURCE,
      stdio: 'inherit'
    });

    // Step 3: Copy built files
    console.log('📂 Copying backend files...');
    
    // Copy dist folder
    await fs.copy(
      path.join(BACKEND_SOURCE, 'dist'),
      path.join(BACKEND_DEST, 'dist')
    );
    
    // Copy package.json
    const packageJson = await fs.readJson(path.join(BACKEND_SOURCE, 'package.json'));
    
    // Remove dev dependencies and scripts for production
    delete packageJson.devDependencies;
    delete packageJson.scripts;
    packageJson.main = 'dist/server.js';
    
    await fs.writeJson(
      path.join(BACKEND_DEST, 'package.json'),
      packageJson,
      { spaces: 2 }
    );

    // Copy printer templates if they exist
    const templatesPath = path.join(BACKEND_SOURCE, 'printer-templates');
    if (await fs.pathExists(templatesPath)) {
      console.log('📄 Copying printer templates...');
      await fs.copy(
        templatesPath,
        path.join(BACKEND_DEST, 'printer-templates')
      );
    }

    // Copy database migrations
    const migrationsPath = path.join(BACKEND_SOURCE, 'dist/migrations');
    if (await fs.pathExists(migrationsPath)) {
      console.log('🗃️ Copying database migrations...');
      await fs.copy(
        migrationsPath,
        path.join(BACKEND_DEST, 'dist/migrations')
      );
    }

    // Step 4: Install production dependencies
    console.log('📦 Installing production dependencies...');
    execSync('npm install --production', {
      cwd: BACKEND_DEST,
      stdio: 'inherit'
    });

    // Step 5: Create entry point
    const entryPoint = `
const path = require('path');
const fs = require('fs');

// Set up environment
process.env.NODE_ENV = 'production';
process.env.DATABASE_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../database.sqlite');
process.env.PRINTER_TEMPLATES_PATH = process.env.PRINTER_TEMPLATES_PATH || path.join(__dirname, 'printer-templates');

// Load the actual server
require('./dist/src/server.js');
`;

    await fs.writeFile(
      path.join(BACKEND_DEST, 'server.js'),
      entryPoint
    );

    // Step 6: Create .env.production template
    const envTemplate = `# Production Environment Configuration
NODE_ENV=production
PORT=3001

# RIVHIT API Configuration (will be set from app settings)
RIVHIT_API_URL=https://api.rivhit.co.il/online/RivhitOnlineAPI.svc
RIVHIT_API_TOKEN=

# Safety Settings
RIVHIT_TEST_MODE=false
RIVHIT_READ_ONLY=false
RIVHIT_MAX_REQUESTS_PER_MINUTE=30

# Cache Settings
RIVHIT_CACHE_DURATION=300
RIVHIT_ENABLE_CACHE=true

# Printer Configuration
PRINTER_CONNECTION_TYPE=usb
PRINTER_PORT=COM1
`;

    await fs.writeFile(
      path.join(BACKEND_DEST, '.env.production'),
      envTemplate
    );

    console.log('\n✅ Backend built successfully!');
    console.log(`📁 Output: ${BACKEND_DEST}`);

    // Calculate size
    const getDirectorySize = (dirPath) => {
      let size = 0;
      const files = fs.readdirSync(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          size += getDirectorySize(filePath);
        } else {
          size += stat.size;
        }
      }
      
      return size;
    };

    const sizeInMB = (getDirectorySize(BACKEND_DEST) / 1024 / 1024).toFixed(2);
    console.log(`📊 Total size: ${sizeInMB} MB`);

  } catch (error) {
    console.error('❌ Error building backend:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  buildBackend();
}

module.exports = { buildBackend };