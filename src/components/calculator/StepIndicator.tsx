import React from "react";

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, totalSteps }) => {
  const steps = [
    { number: 1, label: "Пакет" },
    { number: 2, label: "Параметры" },
    { number: 3, label: "Услуги" },
    { number: 4, label: "Контакты" },
  ];

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <React.Fragment key={step.number}>
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                  currentStep === step.number
                    ? "bg-nature-brown text-white"
                    : currentStep > step.number
                    ? "bg-nature-brown/70 text-white"
                    : "bg-nature-cream text-nature-forest/50 border-2 border-nature-brown/20"
                }`}
              >
                {currentStep > step.number ? "✓" : step.number}
              </div>
              <span
                className={`text-xs mt-2 font-medium ${
                  currentStep === step.number
                    ? "text-nature-brown"
                    : "text-nature-forest/50"
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 mb-6 transition-colors ${
                  currentStep > step.number
                    ? "bg-nature-brown/70"
                    : "bg-nature-brown/20"
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default StepIndicator;
