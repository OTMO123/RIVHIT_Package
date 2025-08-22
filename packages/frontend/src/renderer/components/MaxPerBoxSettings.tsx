import React, { useState, useEffect } from 'react';
import {
  Modal,
  Table,
  Button,
  Form,
  Input,
  InputNumber,
  Space,
  Popconfirm,
  message,
  Typography,
  Card,
  Row,
  Col,
  Tooltip,
  Empty,
  Spin
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SaveOutlined,
  CloseOutlined,
  SettingOutlined,
  InfoCircleOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { apiService } from '../services/api.service';

const { Title, Text } = Typography;

interface MaxPerBoxSetting {
  id: number;
  catalogNumber: string;
  maxQuantity: number;
  description?: string;
  rivhitId?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface MaxPerBoxSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const MaxPerBoxSettingsModal: React.FC<MaxPerBoxSettingsModalProps> = ({ visible, onClose }) => {
  const [settings, setSettings] = useState<MaxPerBoxSetting[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();
  const [addForm] = Form.useForm();
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    if (visible) {
      fetchSettings();
    }
  }, [visible]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await apiService.getMaxPerBoxSettings();
      setSettings(response || []);
    } catch (error) {
      console.error('Error fetching settings:', error);
      message.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    try {
      const values = await addForm.validateFields();
      setLoading(true);
      
      await apiService.createMaxPerBoxSetting({
        catalogNumber: values.catalogNumber,
        maxQuantity: values.maxQuantity,
        description: values.description,
        rivhitId: values.rivhitId
      });
      
      message.success('Setting saved successfully');
      addForm.resetFields();
      setIsAddingNew(false);
      await fetchSettings();
    } catch (error: any) {
      console.error('Error saving setting:', error);
      message.error(error.response?.data?.error || 'Failed to save setting');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id: number) => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      
      await apiService.updateMaxPerBoxSetting(id, {
        maxQuantity: values.maxQuantity,
        description: values.description,
        rivhitId: values.rivhitId
      });
      
      message.success('Setting updated successfully');
      setEditingId(null);
      await fetchSettings();
    } catch (error) {
      message.error('Failed to update setting');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      setLoading(true);
      await apiService.deleteMaxPerBoxSetting(id);
      message.success('Setting deleted successfully');
      await fetchSettings();
    } catch (error) {
      message.error('Failed to delete setting');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Catalog Number',
      dataIndex: 'catalogNumber',
      key: 'catalogNumber',
      width: '25%',
      render: (text: string) => (
        <Text strong copyable>{text}</Text>
      )
    },
    {
      title: 'RivHit ID',
      dataIndex: 'rivhitId',
      key: 'rivhitId',
      width: '15%',
      sorter: (a: MaxPerBoxSetting, b: MaxPerBoxSetting) => {
        // Handle null/undefined values
        const aVal = a.rivhitId || 0;
        const bVal = b.rivhitId || 0;
        return aVal - bVal;
      },
      render: (value: number | undefined, record: MaxPerBoxSetting) => {
        if (editingId === record.id) {
          return (
            <Form.Item
              name="rivhitId"
              style={{ margin: 0 }}
            >
              <InputNumber min={1} style={{ width: '100%' }} placeholder="Optional" />
            </Form.Item>
          );
        }
        return <Text type="secondary">{value || '-'}</Text>;
      }
    },
    {
      title: 'Max Quantity',
      dataIndex: 'maxQuantity',
      key: 'maxQuantity',
      width: '15%',
      render: (value: number, record: MaxPerBoxSetting) => {
        if (editingId === record.id) {
          return (
            <Form.Item
              name="maxQuantity"
              rules={[{ required: true, message: 'Required' }]}
              style={{ margin: 0 }}
            >
              <InputNumber min={1} max={9999} style={{ width: '100%' }} />
            </Form.Item>
          );
        }
        return <Text>{value}</Text>;
      }
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      width: '30%',
      render: (text: string, record: MaxPerBoxSetting) => {
        if (editingId === record.id) {
          return (
            <Form.Item
              name="description"
              style={{ margin: 0 }}
            >
              <Input placeholder="Optional description" />
            </Form.Item>
          );
        }
        return <Text type="secondary">{text || '-'}</Text>;
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '15%',
      render: (_, record: MaxPerBoxSetting) => {
        if (editingId === record.id) {
          return (
            <Space>
              <Button
                type="primary"
                size="small"
                icon={<SaveOutlined />}
                onClick={() => handleUpdate(record.id)}
                loading={loading}
              >
                Save
              </Button>
              <Button
                size="small"
                icon={<CloseOutlined />}
                onClick={() => {
                  setEditingId(null);
                  form.resetFields();
                }}
              >
                Cancel
              </Button>
            </Space>
          );
        }
        return (
          <Space>
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => {
                setEditingId(record.id);
                form.setFieldsValue({
                  maxQuantity: record.maxQuantity,
                  description: record.description,
                  rivhitId: record.rivhitId
                });
              }}
            >
              Edit
            </Button>
            <Popconfirm
              title="Are you sure you want to delete this setting?"
              onConfirm={() => handleDelete(record.id)}
              okText="Yes"
              cancelText="No"
            >
              <Button type="link" danger icon={<DeleteOutlined />}>
                Delete
              </Button>
            </Popconfirm>
          </Space>
        );
      }
    }
  ];

  // Filter settings based on search text
  const filteredSettings = settings.filter(setting => {
    if (!searchText) return true;
    
    const searchLower = searchText.toLowerCase();
    
    // Search by catalog number
    if (setting.catalogNumber.toLowerCase().includes(searchLower)) return true;
    
    // Search by RivHit ID
    if (setting.rivhitId && setting.rivhitId.toString().includes(searchText)) return true;
    
    // Search by max quantity
    if (setting.maxQuantity.toString().includes(searchText)) return true;
    
    return false;
  });

  return (
    <Modal
      title={
        <Space>
          <SettingOutlined />
          <span>Maximum Per Box Dictionary</span>
        </Space>
      }
      visible={visible}
      onCancel={onClose}
      width={800}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>
      ]}
    >
      <Card>
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text type="secondary">
                  Configure maximum quantities per box for different catalog numbers
                </Text>
                <Tooltip title="These settings control how many items of each catalog number can be packed in a single box">
                  <InfoCircleOutlined style={{ color: '#1890ff' }} />
                </Tooltip>
              </div>
              
              {!isAddingNew && (
                <Row gutter={16} style={{ marginBottom: 16 }}>
                  <Col>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => setIsAddingNew(true)}
                    >
                      Add New Setting
                    </Button>
                  </Col>
                  <Col flex="auto">
                    <Input
                      placeholder="Search by catalog number, RivHit ID, or max quantity"
                      prefix={<SearchOutlined />}
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      style={{ width: 400 }}
                      allowClear
                    />
                  </Col>
                </Row>
              )}

              {isAddingNew && (
                <Card style={{ marginBottom: 16, backgroundColor: '#f0f2f5' }}>
                  <Form
                    form={addForm}
                    layout="horizontal"
                    onFinish={handleAdd}
                  >
                    <Row gutter={[16, 16]}>
                      <Col span={8}>
                        <Form.Item
                          name="catalogNumber"
                          rules={[
                            { required: true, message: 'Catalog number is required' },
                            { max: 50, message: 'Maximum 50 characters' }
                          ]}
                          style={{ marginBottom: 8 }}
                        >
                          <Input
                            placeholder="Catalog Number (e.g., 7290011585228)"
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                        <Form.Item name="description" style={{ marginBottom: 0 }}>
                          <Input
                            placeholder="Description (optional)"
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item
                          name="maxQuantity"
                          rules={[
                            { required: true, message: 'Max quantity is required' },
                            { type: 'number', min: 1, message: 'Must be at least 1' }
                          ]}
                          style={{ marginBottom: 8 }}
                        >
                          <InputNumber
                            placeholder="Max Quantity"
                            min={1}
                            max={9999}
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                        <Form.Item name="rivhitId" style={{ marginBottom: 0 }}>
                          <InputNumber
                            placeholder="RivHit ID"
                            min={1}
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12} style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                        <Space>
                          <Button
                            type="primary"
                            htmlType="submit"
                            icon={<PlusOutlined />}
                            loading={loading}
                          >
                            Add
                          </Button>
                          <Button
                            onClick={() => {
                              setIsAddingNew(false);
                              addForm.resetFields();
                            }}
                            icon={<CloseOutlined />}
                          >
                            Cancel
                          </Button>
                        </Space>
                      </Col>
                    </Row>
                  </Form>
                </Card>
              )}

              <Form form={form}>
                <Table
                  columns={columns}
                  dataSource={filteredSettings}
                  rowKey="id"
                  loading={loading}
                  pagination={{
                    pageSize: 7,
                    showSizeChanger: true,
                    pageSizeOptions: ['7', '14', '21', '28'],
                    showTotal: (total) => `Total ${total} settings`
                  }}
                  locale={{
                    emptyText: (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="No settings configured yet"
                      >
                        <Button type="primary" onClick={() => setIsAddingNew(true)}>
                          Add First Setting
                        </Button>
                      </Empty>
                    )
                  }}
                />
              </Form>
            </Space>
          </Col>
        </Row>
      </Card>
    </Modal>
  );
};