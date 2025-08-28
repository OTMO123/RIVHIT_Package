import React, { useState } from 'react';
import { Modal, Tabs, Button, Space } from 'antd';
import { 
  SettingOutlined, 
  PrinterOutlined, 
  DatabaseOutlined 
} from '@ant-design/icons';
import { MaxPerBoxSettingsContent } from './MaxPerBoxSettingsContent';
import { PrinterSettings } from './PrinterSettings';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ visible, onClose }) => {
  const [activeTab, setActiveTab] = useState('max-per-box');

  return (
    <Modal
      title={
        <Space>
          <SettingOutlined />
          <span>Настройки системы</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={950}
      footer={[
        <Button key="close" onClick={onClose}>
          Закрыть
        </Button>
      ]}
      styles={{ body: { padding: 0 } }}
    >
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        style={{ minHeight: 500 }}
        tabBarStyle={{ padding: '0 24px', margin: 0 }}
        items={[
          {
            key: 'max-per-box',
            label: (
              <Space>
                <DatabaseOutlined />
                Словарь максимумов в коробке
              </Space>
            ),
            children: (
              <div style={{ padding: 24 }}>
                <MaxPerBoxSettingsContent />
              </div>
            )
          },
          {
            key: 'printer-settings',
            label: (
              <Space>
                <PrinterOutlined />
                Настройки принтера
              </Space>
            ),
            children: (
              <div style={{ padding: 24 }}>
                <PrinterSettings />
              </div>
            )
          }
        ]}
      />
    </Modal>
  );
};