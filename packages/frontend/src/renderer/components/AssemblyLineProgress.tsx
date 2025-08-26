import React from 'react';
import { CheckCircleFilled, LoadingOutlined } from '@ant-design/icons';
import './AssemblyLineProgress.css';

export interface AssemblyStep {
  id: string;
  title: string;
  titleHe: string;
  icon: React.ReactNode;
  status: 'pending' | 'active' | 'completed';
}

interface AssemblyLineProgressProps {
  currentStep: number;
  steps: AssemblyStep[];
  locale?: 'ru' | 'he';
}

export const AssemblyLineProgress: React.FC<AssemblyLineProgressProps> = ({
  currentStep,
  steps,
  locale = 'ru'
}) => {
  return (
    <div className="assembly-line-container">
      <div className="assembly-line">
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;
          const isPending = index > currentStep;
          
          return (
            <React.Fragment key={step.id}>
              <div className={`assembly-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isPending ? 'pending' : ''}`}>
                <div className="step-icon-wrapper">
                  <div className="step-icon">
                    {isCompleted ? (
                      <CheckCircleFilled style={{ fontSize: '24px', color: '#52c41a' }} />
                    ) : isActive ? (
                      <div className="active-icon-container">
                        {step.icon}
                        <LoadingOutlined className="loading-spinner" style={{ fontSize: '20px', color: '#1890ff' }} />
                      </div>
                    ) : (
                      <div className="pending-icon">
                        {step.icon}
                      </div>
                    )}
                  </div>
                  {isActive && <div className="pulse-ring"></div>}
                </div>
                <div className="step-content">
                  <div className="step-number">
                    {isCompleted ? '✓' : index + 1}
                  </div>
                  <div className="step-title">
                    {locale === 'he' ? step.titleHe : step.title}
                  </div>
                </div>
              </div>
              
              {index < steps.length - 1 && (
                <div className={`connector ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}>
                  <div className="connector-line"></div>
                  <div className="connector-progress"></div>
                  <svg className="connector-arrow" viewBox="0 0 24 24" width="20" height="20">
                    <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
                  </svg>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
      
      <div className="assembly-status">
        <div className="status-text">
          {locale === 'ru' ? (
            <>
              Этап {currentStep + 1} из {steps.length}: <strong>{steps[currentStep]?.title}</strong>
            </>
          ) : (
            <>
              שלב {currentStep + 1} מתוך {steps.length}: <strong>{steps[currentStep]?.titleHe}</strong>
            </>
          )}
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};