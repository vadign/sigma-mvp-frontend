import { useState } from 'react';
import { Tabs, Typography, message } from 'antd';
import RegulationsEditor from '../../components/RegulationsEditor';
import {
  createRegulationsData,
  deleteRegulationsData,
  getRegulationsData,
  updateRegulationsData,
  createShapesData,
  deleteShapesData,
  getShapesData,
  updateShapesData,
} from '../../api/regulations';

export default function RegulationsPage() {
  const [regulations, setRegulations] = useState('');
  const [shapes, setShapes] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async (
    action: () => Promise<void | string>,
    onSuccess?: (data?: string) => void,
  ) => {
    setLoading(true);
    try {
      const result = await action();
      onSuccess?.(result as string | undefined);
      message.success('Успешно выполнено');
    } catch (err) {
      message.error((err as Error)?.message ?? 'Ошибка запроса');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content-card">
      <Typography.Title level={3}>Регламенты</Typography.Title>
      <Tabs
        defaultActiveKey="regulations"
        items={[
          {
            key: 'regulations',
            label: 'Данные регламентов',
            children: (
              <RegulationsEditor
                value={regulations}
                onChange={setRegulations}
                loading={loading}
                onLoad={() => handle(async () => setRegulations(await getRegulationsData()))}
                onCreate={() => handle(() => createRegulationsData(regulations))}
                onUpdate={() => handle(() => updateRegulationsData(regulations))}
                onDelete={() => handle(deleteRegulationsData, () => setRegulations(''))}
              />
            ),
          },
          {
            key: 'shapes',
            label: 'Shapes',
            children: (
              <RegulationsEditor
                value={shapes}
                onChange={setShapes}
                loading={loading}
                onLoad={() => handle(async () => setShapes(await getShapesData()))}
                onCreate={() => handle(() => createShapesData(shapes))}
                onUpdate={() => handle(() => updateShapesData(shapes))}
                onDelete={() => handle(deleteShapesData, () => setShapes(''))}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
