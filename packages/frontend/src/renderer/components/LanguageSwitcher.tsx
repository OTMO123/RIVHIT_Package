import React from 'react';
import { Select, Space } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { useI18n } from '../i18n/i18n';
import { Language, languageConfig } from '../i18n/translations';

const { Option } = Select;

// Flag emojis for each language
const languageFlags = {
  he: '🇮🇱',
  ru: '🇷🇺', 
  en: '🇺🇸',
  ar: '🇸🇦'
};

export const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useI18n();

  return (
    <Space>
      <GlobalOutlined style={{ color: '#1890ff' }} />
      <Select
        value={language}
        onChange={(value: Language) => setLanguage(value)}
        style={{ minWidth: 120 }}
        size="middle"
      >
        {Object.entries(languageConfig).map(([lang, config]) => (
          <Option key={lang} value={lang}>
            <Space>
              <span>{languageFlags[lang as Language]}</span>
              <span>{config.name}</span>
            </Space>
          </Option>
        ))}
      </Select>
    </Space>
  );
};
