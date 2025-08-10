import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Brain, TrendingUp, AlertTriangle, Calendar, Activity } from 'lucide-react';
import { apiService, Component } from '../services/api';

interface MLPrediction {
  next_maintenance_date: string;
  failure_probability: number;
  recommended_actions: string[];
  confidence: number;
}

const MLPredictions: React.FC = () => {
  const { componentId } = useParams<{ componentId: string }>();
  const navigate = useNavigate();
  const [component, setComponent] = useState<Component | null>(null);
  const [predictions, setPredictions] = useState<MLPrediction | null>(null);
  const [sensorData, setSensorData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (componentId) {
      fetchData();
    }
  }, [componentId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [componentData, mlPredictions, sensorData] = await Promise.all([
        apiService.getComponent(parseInt(componentId!)),
        apiService.getMLPredictions(parseInt(componentId!)),
        apiService.getSensorValues(parseInt(componentId!)), // <-- new call
      ]);
      
      setComponent(componentData);
      setPredictions(mlPredictions);
      setSensorData(sensorData); // <-- store sensor values
      setLoading(false);
    } catch (err) {
      setError('Failed to load ML predictions');
      setLoading(false);
    }
  };

  const getFailureRiskColor = (probability: number) => {
    if (probability < 0.3) return 'text-green-400';
    if (probability < 0.6) return 'text-orange-400';
    return 'text-red-400';
  };

  const getFailureRiskLevel = (probability: number) => {
    if (probability < 0.3) return 'Low';
    if (probability < 0.6) return 'Medium';
    return 'High';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-400">Loading ML predictions...</span>
      </div>
    );
  }

  if (error || !component) {
    return (
      <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <AlertTriangle className="w-6 h-6 text-red-400 mr-3" />
          <h3 className="text-lg font-semibold text-red-400">Error</h3>
        </div>
        <p className="text-red-300 mb-4">{error || 'Component not found'}</p>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center space-x-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-400 hover:text-blue-400 transition-colors duration-200 text-lg font-medium"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </button>
          <div className="flex flex-col">
            <div className="flex items-baseline space-x-3">
              <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-purple-300 to-pink-300 tracking-tight">
                {component.name}
              </h1>
              <span className="text-lg font-medium text-gray-400 px-3 py-1 bg-gray-800 rounded-full">
                ML Predictions
              </span>
            </div>
            <div className="flex items-center mt-2 space-x-4">
              <div className="flex items-center space-x-2">
                <Brain className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-gray-400 font-medium">AI-Powered Insights</span>
              </div>
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-green-400" />
                <span className="text-sm text-gray-400 font-medium">Real-time Analysis</span>
              </div>
            </div>
          </div>
        </div>
        <div className={`px-6 py-3 rounded-xl text-lg font-bold tracking-wide shadow-lg border ${component.status === 'critical' ? 'bg-red-900/40 text-red-300 border-red-500/30' : component.status === 'warning' ? 'bg-orange-900/40 text-orange-300 border-orange-500/30' : 'bg-green-900/40 text-green-300 border-green-500/30'}`}>
          {component.status?.toUpperCase()}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Side - Predictions Overview */}
        <div className="space-y-6">
          {/* Failure Risk Assessment */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-purple-400 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Failure Risk Assessment
            </h2>
            <div className="space-y-4">
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-gray-400">Failure Probability</div>
                  <div className={`text-lg font-bold ${getFailureRiskColor(predictions?.failure_probability || 0)}`}>
                    {(predictions?.failure_probability || 0) * 100}%
                  </div>
                </div>
                <div className="w-full bg-gray-600 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full transition-all duration-500 ${
                      (predictions?.failure_probability || 0) < 0.3 ? 'bg-green-400' :
                      (predictions?.failure_probability || 0) < 0.6 ? 'bg-orange-400' : 'bg-red-400'
                    }`}
                    style={{ width: `${(predictions?.failure_probability || 0) * 100}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-2">
                  <span>Low Risk</span>
                  <span>High Risk</span>
                </div>
              </div>
              
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-400">Risk Level</div>
                  <div className={`text-lg font-bold ${getFailureRiskColor(predictions?.failure_probability || 0)}`}>
                    {getFailureRiskLevel(predictions?.failure_probability || 0)}
                  </div>
                </div>
              </div>

              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-400">Model Confidence</div>
                  <div className="text-lg font-bold text-blue-400">
                    {(predictions?.confidence || 0) * 100}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Next Maintenance Prediction */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-blue-400 flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Next Maintenance Prediction
            </h2>
            <div className="space-y-4">
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-2">Predicted Date</div>
                <div className="text-lg font-bold text-blue-300">
                  {predictions?.next_maintenance_date ? 
                    new Date(predictions.next_maintenance_date).toLocaleDateString() : 
                    'Not available'
                  }
                </div>
              </div>
              
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-2">Days Until Maintenance</div>
                <div className="text-lg font-bold text-blue-300">
                  {predictions?.next_maintenance_date ? 
                    Math.ceil((new Date(predictions.next_maintenance_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 
                    'N/A'
                  } days
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Recommended Actions */}
        <div className="space-y-6">
          {/* Recommended Actions */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-green-400 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Recommended Actions
            </h2>
            <div className="space-y-4">
              {predictions?.recommended_actions && predictions.recommended_actions.length > 0 ? (
                predictions.recommended_actions.map((action, index) => (
                  <div key={index} className="bg-gray-700 rounded-lg p-4 border-l-4 border-green-400">
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                      <div>
                        <div className="font-medium text-green-300">{action}</div>
                        <div className="text-sm text-gray-400 mt-1">
                          AI-recommended action based on current sensor data and historical patterns
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-gray-400 text-center py-8">
                  No specific actions recommended at this time
                </div>
              )}
            </div>
          </div>

          {/* Model Information */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-purple-400 flex items-center">
              <Brain className="w-5 h-5 mr-2" />
              Model Information
            </h2>
            <div className="space-y-4">
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-2">Model Type</div>
                <div className="text-lg font-bold text-purple-300">Predictive Maintenance AI</div>
              </div>
              
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-2">Data Sources</div>
                <div className="text-sm text-gray-300">
                  • Temperature sensor readings<br/>
                  • Vibration measurements<br/>
                  • Noise level data<br/>
                  • Historical maintenance records<br/>
                  • Component performance patterns
                </div>
              </div>
              
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-2">Last Updated</div>
                <div className="text-lg font-bold text-purple-300">
                  {new Date().toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MLPredictions;
