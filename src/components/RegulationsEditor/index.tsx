import { Button, Input, Space } from 'antd';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onLoad: () => void;
  onCreate: () => void;
  onUpdate: () => void;
  onDelete: () => void;
  loading?: boolean;
}

export default function RegulationsEditor({
  value,
  onChange,
  onLoad,
  onCreate,
  onUpdate,
  onDelete,
  loading,
}: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Space>
        <Button onClick={onLoad} loading={loading}>
          Загрузить
        </Button>
        <Button onClick={onCreate} loading={loading}>
          Создать
        </Button>
        <Button type="primary" onClick={onUpdate} loading={loading}>
          Сохранить
        </Button>
        <Button danger onClick={onDelete} loading={loading}>
          Удалить
        </Button>
      </Space>
      <Input.TextArea rows={12} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
