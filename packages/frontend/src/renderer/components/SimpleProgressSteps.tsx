import React from 'react';
import { CheckCircleFilled } from '@ant-design/icons';
import './SimpleProgressSteps.css';

export type StepStatus = 'pending' | 'active' | 'completed';

export interface SimpleStep {
  key: string;
  title: string;
  titleHe: string;
  status: StepStatus;
}

interface SimpleProgressStepsProps {
  steps: SimpleStep[];
  locale?: 'ru' | 'he';
}

export const SimpleProgressSteps: React.FC<SimpleProgressStepsProps> = ({
  steps,
  locale = 'ru'
}) => {
  return (
    <div className="simple-progress-container">
      {steps.map((step, index) => (
        <React.Fragment key={step.key}>
          <div className={`simple-step ${step.status}`}>
            <div className="step-indicator">
              {step.status === 'completed' ? (
                <CheckCircleFilled />
              ) : (
                <span>{index + 1}</span>
              )}
            </div>
            <div className="step-label">
              {locale === 'he' ? step.titleHe : step.title}
            </div>
          </div>
          {index < steps.length - 1 && (
            <div className={`step-connector ${
              steps[index + 1].status !== 'pending' ? 'active' : ''
            }`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};