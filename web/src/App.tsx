import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import EventMonitorPage from './pages/EventMonitorPage';
import SolutionManagementPage from './pages/SolutionManagementPage';
import TaskManagementPage from './pages/TaskManagementPage';
import EventTypePage from './pages/config/EventTypePage';
import PlanTemplatePage from './pages/config/PlanTemplatePage';
import SolutionTemplatePage from './pages/config/SolutionTemplatePage';
import OrganizationPage from './pages/config/OrganizationPage';
import ResourcePage from './pages/config/ResourcePage';
import CorrelationAnalysisPage from './pages/analysis/CorrelationAnalysisPage';
import RootCausePage from './pages/analysis/RootCausePage';
import EvaluationPage from './pages/analysis/EvaluationPage';
import KnowledgeBasePage from './pages/KnowledgeBasePage';
import SkillLibraryPage from './pages/SkillLibraryPage';
import AIAssistantPage from './pages/AIAssistantPage';
import ModelConfigPage from './pages/ModelConfigPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="event-monitor" element={<EventMonitorPage />} />
        <Route path="solution-management" element={<SolutionManagementPage />} />
        <Route path="task-management" element={<TaskManagementPage />} />
        <Route path="config/event-type" element={<EventTypePage />} />
        <Route path="config/plan-template" element={<PlanTemplatePage />} />
        <Route path="config/solution-template" element={<SolutionTemplatePage />} />
        <Route path="config/organization" element={<OrganizationPage />} />
        <Route path="config/resource" element={<ResourcePage />} />
        <Route path="analysis/correlation" element={<CorrelationAnalysisPage />} />
        <Route path="analysis/root-cause" element={<RootCausePage />} />
        <Route path="analysis/evaluation" element={<EvaluationPage />} />
        <Route path="knowledge-base" element={<KnowledgeBasePage />} />
        <Route path="skill-library" element={<SkillLibraryPage />} />
        <Route path="ai-assistant" element={<AIAssistantPage />} />
        <Route path="model-config" element={<ModelConfigPage />} />
      </Route>
    </Routes>
  );
}

export default App;
