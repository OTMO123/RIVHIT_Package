import React from 'react';
import { Modal, Row, Col, Card, Typography } from 'antd';
import { EnvironmentOutlined, CompassOutlined, GlobalOutlined, FireOutlined } from '@ant-design/icons';
import { DeliveryRegion } from '@packing/shared';

const { Title, Text } = Typography;

interface RegionSelectorProps {
  visible: boolean;
  onSelect: (region: DeliveryRegion) => void;
  onCancel: () => void;
}

const regions = [
  {
    id: DeliveryRegion.SOUTH1,
    nameHebrew: 'דרום 1',
    nameRussian: 'Юг 1',
    icon: <EnvironmentOutlined style={{ fontSize: 48 }} />,
    color: '#ff7875',
    description: 'אזור דרום - מחוז 1'
  },
  {
    id: DeliveryRegion.SOUTH2,
    nameHebrew: 'דרום 2',
    nameRussian: 'Юг 2',
    icon: <FireOutlined style={{ fontSize: 48 }} />,
    color: '#ffa940',
    description: 'אזור דרום - מחוז 2'
  },
  {
    id: DeliveryRegion.NORTH1,
    nameHebrew: 'צפון 1',
    nameRussian: 'Север 1',
    icon: <CompassOutlined style={{ fontSize: 48 }} />,
    color: '#73d13d',
    description: 'אזור צפון - מחוז 1'
  },
  {
    id: DeliveryRegion.NORTH2,
    nameHebrew: 'צפון 2',
    nameRussian: 'Север 2',
    icon: <GlobalOutlined style={{ fontSize: 48 }} />,
    color: '#40a9ff',
    description: 'אזור צפון - מחוז 2'
  }
];

export const RegionSelector: React.FC<RegionSelectorProps> = ({ visible, onSelect, onCancel }) => {
  return (
    <Modal
      title={
        <div style={{ textAlign: 'center', fontSize: 24, fontWeight: 'bold' }}>
          בחר אזור משלוח
        </div>
      }
      visible={visible}
      onCancel={onCancel}
      footer={null}
      width={800}
      centered
      styles={{ body: { padding: '32px' } }}
    >
      <Row gutter={[24, 24]}>
        {regions.map((region) => (
          <Col span={12} key={region.id}>
            <Card
              hoverable
              onClick={() => onSelect(region.id)}
              style={{
                textAlign: 'center',
                borderColor: region.color,
                borderWidth: 3,
                minHeight: 180,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                backgroundColor: `${region.color}10`
              }}
              styles={{
                body: {
                  padding: '32px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '16px'
                }
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = `0 8px 24px ${region.color}40`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '';
              }}
            >
              <Title level={2} style={{ margin: 0, color: region.color, fontWeight: 'bold' }}>
                {region.nameHebrew}
              </Title>
              <Title level={3} style={{ margin: 0, color: region.color }}>
                {region.nameRussian}
              </Title>
            </Card>
          </Col>
        ))}
      </Row>
    </Modal>
  );
};