import { Button, Space, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { AgentId } from '../utils/agents';
import { AGENT_DOMAIN_LABELS } from '../features/agentSettings/regulations';
import RegulationsPanel from './RegulationsPanel';

interface AgentRegulationsPanelProps {
  agentId: AgentId;
}

function AgentRegulationsPanel({ agentId }: AgentRegulationsPanelProps) {
  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Space style={{ justifyContent: 'space-between', width: '100%' }} align="start" wrap>
        <div>
          <Typography.Text strong>{`OWL-регламенты: ${AGENT_DOMAIN_LABELS[agentId]}`}</Typography.Text>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            Показываются и редактируются те же OWL/SHACL регламенты, что и на странице «Регламенты».
          </Typography.Paragraph>
        </div>
        <Link to="/regulations">
          <Button type="link">Открыть /regulations</Button>
        </Link>
      </Space>
      <RegulationsPanel showHeader={false} editorHeight="420px" />
    </Space>
  );
}

export default AgentRegulationsPanel;
