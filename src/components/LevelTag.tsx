import { Tag } from 'antd';

interface Props {
  level: number | null | undefined;
}

const levelColor: Record<number, string> = {
  1: 'gold',
  2: 'orange',
  3: 'red',
};

function LevelTag({ level }: Props) {
  if (!level) {
    return <Tag>нет данных</Tag>;
  }
  return <Tag color={levelColor[level]}>Уровень {level}</Tag>;
}

export default LevelTag;
