import React, { useState, useEffect } from 'react';
import {
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

export const MaxPerBoxSettingsContent: React.FC = () => {
  const [settings, setSettings] = useState<MaxPerBoxSetting[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();
  const [addForm] = Form.useForm();
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await apiService.getMaxPerBoxSettings();
      setSettings(response || []);
    } catch (error) {
      console.error('Error fetching settings:', error);
      message.error('Ошибка загрузки настроек');
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
      
      message.success('Настройка сохранена успешно');
      addForm.resetFields();
      setIsAddingNew(false);
      await fetchSettings();
    } catch (error: any) {
      console.error('Error saving setting:', error);
      message.error(error.response?.data?.error || 'Ошибка сохранения настройки');
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
      
      message.success('Настройка обновлена успешно');
      setEditingId(null);
      await fetchSettings();
    } catch (error) {
      message.error('Ошибка обновления настройки');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      setLoading(true);
      await apiService.deleteMaxPerBoxSetting(id);
      message.success('Настройка удалена успешно');
      await fetchSettings();
    } catch (error) {
      message.error('Ошибка удаления настройки');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Каталожный номер',
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
              <InputNumber min={1} style={{ width: '100%' }} placeholder="Опционально" />
            </Form.Item>
          );
        }
        return <Text type="secondary">{value || '-'}</Text>;
      }
    },
    {
      title: 'Макс. количество',
      dataIndex: 'maxQuantity',
      key: 'maxQuantity',
      width: '15%',
      render: (value: number, record: MaxPerBoxSetting) => {
        if (editingId === record.id) {
          return (
            <Form.Item
              name="maxQuantity"
              rules={[{ required: true, message: 'Обязательно' }]}
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
      title: 'Описание',
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
              <Input placeholder="Опциональное описание" />
            </Form.Item>
          );
        }
        return <Text type="secondary">{text || '-'}</Text>;
      }
    },
    {
      title: 'Действия',
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
                Сохранить
              </Button>
              <Button
                size="small"
                icon={<CloseOutlined />}
                onClick={() => {
                  setEditingId(null);
                  form.resetFields();
                }}
              >
                Отмена
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
              Редактировать
            </Button>
            <Popconfirm
              title="Вы уверены, что хотите удалить эту настройку?"
              onConfirm={() => handleDelete(record.id)}
              okText="Да"
              cancelText="Нет"
            >
              <Button type="link" danger icon={<DeleteOutlined />}>
                Удалить
              </Button>
            </Popconfirm>
          </Space>
        );
      }
    }
  ];

  // Фильтрация настроек по поисковому тексту
  const filteredSettings = settings.filter(setting => {
    if (!searchText) return true;
    
    const searchLower = searchText.toLowerCase();
    
    if (setting.catalogNumber.toLowerCase().includes(searchLower)) return true;
    if (setting.rivhitId && setting.rivhitId.toString().includes(searchText)) return true;
    if (setting.maxQuantity.toString().includes(searchText)) return true;
    
    return false;
  });

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>
        Словарь максимумов в коробке
      </Title>
      
      <Card>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text type="secondary">
              Настройка максимального количества товаров в коробке для разных каталожных номеров
            </Text>
            <Tooltip title="Эти настройки управляют количеством товаров каждого каталожного номера, которое может быть упаковано в одну коробку">
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
                  Добавить новую настройку
                </Button>
              </Col>
              <Col flex="auto">
                <Input
                  placeholder="Поиск по каталожному номеру, RivHit ID или максимальному количеству"
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
                        { required: true, message: 'Каталожный номер обязателен' },
                        { max: 50, message: 'Максимум 50 символов' }
                      ]}
                      style={{ marginBottom: 8 }}
                    >
                      <Input
                        placeholder="Каталожный номер (например, 7290011585228)"
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                    <Form.Item name="description" style={{ marginBottom: 0 }}>
                      <Input
                        placeholder="Описание (опционально)"
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={4}>
                    <Form.Item
                      name="maxQuantity"
                      rules={[
                        { required: true, message: 'Максимальное количество обязательно' },
                        { type: 'number', min: 1, message: 'Должно быть минимум 1' }
                      ]}
                      style={{ marginBottom: 8 }}
                    >
                      <InputNumber
                        placeholder="Макс. кол-во"
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
                        Добавить
                      </Button>
                      <Button
                        onClick={() => {
                          setIsAddingNew(false);
                          addForm.resetFields();
                        }}
                        icon={<CloseOutlined />}
                      >
                        Отмена
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
                showTotal: (total) => `Всего ${total} настроек`
              }}
              locale={{
                emptyText: (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="Настройки пока не сконфигурированы"
                  >
                    <Button type="primary" onClick={() => setIsAddingNew(true)}>
                      Добавить первую настройку
                    </Button>
                  </Empty>
                )
              }}
            />
          </Form>
        </Space>
      </Card>
    </div>
  );
};