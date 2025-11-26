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
          Load
        </Button>
        <Button onClick={onCreate} loading={loading}>
          Create
        </Button>
        <Button type="primary" onClick={onUpdate} loading={loading}>
          Save (Update)
        </Button>
        <Button danger onClick={onDelete} loading={loading}>
          Delete
        </Button>
      </Space>
      <Input.TextArea rows={12} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
