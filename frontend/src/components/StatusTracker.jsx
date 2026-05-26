export default function StatusTracker({ currentLevel, status, logs = [] }) {
  const steps = [
    { level: 1, label: 'Supervisor' },
    { level: 2, label: 'Assistant Mgr' },
    { level: 3, label: 'Manager' }
  ];

  const rejectedLog = logs.find((log) => log.action === 'rejected');
  const rejectedLevel = rejectedLog ? rejectedLog.level : currentLevel;
  const progressWidth = status === 'approved'
    ? '100%'
    : status === 'rejected'
      ? `${((rejectedLevel - 1) / 3) * 100}%`
      : `${((currentLevel - 1) / 3) * 100}%`;

  return (
    <div style={{ margin: '1rem 0' }}>
      <div className="stepper-container">
        <div className="stepper-line">
          <div className="stepper-line-progress" style={{ width: progressWidth }} />
        </div>

        {steps.map((step) => {
          let stepClass;
          let bubbleContent = step.level;

          if (status === 'rejected') {
            const rejectedLog = logs.find((log) => log.action === 'rejected');
            const rejectedLevel = rejectedLog ? rejectedLog.level : currentLevel;

            if (step.level < rejectedLevel) {
              stepClass = 'completed';
              bubbleContent = 'OK';
            } else if (step.level === rejectedLevel) {
              stepClass = 'rejected';
              bubbleContent = 'X';
            } else {
              stepClass = 'pending';
            }
          } else if (status === 'approved') {
            stepClass = 'completed';
            bubbleContent = 'OK';
          } else if (currentLevel > step.level) {
            stepClass = 'completed';
            bubbleContent = 'OK';
          } else if (currentLevel === step.level) {
            stepClass = 'active';
          } else {
            stepClass = 'pending';
          }

          return (
            <div key={step.level} className={`stepper-step ${stepClass}`}>
              <div className="step-bubble">{bubbleContent}</div>
              <div className="step-label">{step.label}</div>
            </div>
          );
        })}

        <div className={`stepper-step ${status === 'approved' ? 'completed' : status === 'rejected' ? 'rejected' : 'pending'}`}>
          <div className="step-bubble">
            {status === 'approved' ? 'OK' : status === 'rejected' ? 'X' : 'End'}
          </div>
          <div className="step-label">
            {status === 'approved' ? 'Approved' : status === 'rejected' ? 'Rejected' : 'Final Certification'}
          </div>
        </div>
      </div>
    </div>
  );
}
