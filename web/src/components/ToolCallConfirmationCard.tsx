import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface ToolCallData {
  name: string;
  arguments: Record<string, any>;
  description: string;
}

interface ToolCallConfirmationCardProps {
  toolCall: ToolCallData;
  sessionId: string;
  onConfirm: (toolCall: ToolCallData, sessionId: string) => void;
  onCancel: () => void;
  isExecuting: boolean;
}

function ToolCallConfirmationCard({
  toolCall,
  sessionId,
  onConfirm,
  onCancel,
  isExecuting,
}: ToolCallConfirmationCardProps) {
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (isExecuting) return;
    
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onConfirm(toolCall, sessionId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [toolCall, sessionId, onConfirm, isExecuting]);

  return (
    <div className="mt-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
          <AlertCircle className="w-4 h-4 text-blue-600" />
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-gray-800 mb-2">
            🔍 检测到技能调用
          </h4>
          <p className="text-sm text-gray-600 mb-3">
            {toolCall.description}
          </p>
          {Object.keys(toolCall.arguments).length > 0 && (
            <div className="bg-white rounded-lg p-3 mb-3 border border-gray-100">
              <p className="text-xs text-gray-500 mb-2">执行参数：</p>
              <div className="space-y-1">
                {Object.entries(toolCall.arguments).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500">{key}</span>
                    <span className="text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                      {typeof value === 'string' ? value : JSON.stringify(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => onConfirm(toolCall, sessionId)}
              disabled={isExecuting}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {isExecuting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  执行中...
                </>
              ) : (
                <>
                  <CheckCircle className="w-3.5 h-3.5" />
                  确认执行
                  {countdown > 0 && (
                    <span className="text-blue-200">(自动执行 {countdown}s)</span>
                  )}
                </>
              )}
            </button>
            <button
              onClick={onCancel}
              disabled={isExecuting}
              className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ToolCallConfirmationCard;
