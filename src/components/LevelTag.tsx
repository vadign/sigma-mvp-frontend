import { Tag } from 'antd';
import { getSeverityMeta, SeverityLevel } from '../utils/severity';

interface Props {
  level: SeverityLevel | number;
}

function LevelTag({ level }: Props) {
  const meta = getSeverityMeta(level as SeverityLevel);
  return <Tag color={meta.color}>{meta.tagText}</Tag>;
}

export default LevelTag;
