import React from 'react';
import { Layout as AntLayout, Menu, Typography, Space } from 'antd';
import { 
  AppstoreOutlined, 
  PrinterOutlined, 
  SettingOutlined,
  HomeOutlined,
  ShoppingCartOutlined,
  ContainerOutlined
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n/i18n';
import { LanguageSwitcher } from '../LanguageSwitcher';

const { Header, Sider, Content } = AntLayout;
const { Title } = Typography;

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, dir, language } = useI18n();

  const menuItems = [
    {
      key: '/orders',
      icon: <ShoppingCartOutlined />,
      label: t.nav.orders,
    },
    {
      key: '/printer-test',
      icon: <PrinterOutlined />,
      label: language === 'ru' ? 'Тест принтера' : 'Printer Test',
    }
    // Temporarily disabled pages:
    // {
    //   key: '/packing',
    //   icon: <ContainerOutlined />,
    //   label: t.nav.packing,
    // },
    // {
    //   key: '/printing',
    //   icon: <PrinterOutlined />,
    //   label: t.nav.printing,
    // },
    // {
    //   key: '/dashboard',
    //   icon: <HomeOutlined />,
    //   label: 'Dashboard',
    // }
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  return (
    <AntLayout style={{ minHeight: '100vh', direction: dir }}>
      <Sider 
        width={220} 
        style={{ 
          background: '#fff',
          borderRight: '1px solid #f0f0f0'
        }}
      >
        <div style={{ 
          padding: '16px', 
          borderBottom: '1px solid #f0f0f0',
          textAlign: 'center'
        }}>
          <Title level={4} style={{ margin: '0 0 8px 0', color: '#1890ff' }}>
            RIVHIT Pack
          </Title>
          <LanguageSwitcher />
        </div>
        
        <Menu
          mode="inline"
          selectedKeys={[location.pathname === '/' ? '/orders' : location.pathname]}
          style={{ 
            border: 'none',
            paddingTop: '16px'
          }}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      
      <AntLayout>
        <Header style={{ 
          background: '#fff', 
          padding: '0 24px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Title level={3} style={{ margin: 0 }}>
            RIVHIT {t.nav.packing}
          </Title>
          
          <Space>
            <SettingOutlined style={{ fontSize: '18px', color: '#999' }} />
          </Space>
        </Header>
        
        <Content style={{ 
          margin: 0,
          background: '#f5f5f5'
        }}>
          {children}
        </Content>
      </AntLayout>
    </AntLayout>
  );
};