import { useEffect, useState } from 'react';
import { Button, Col, Input, Row, Space, Spin, Typography, message } from 'antd';
import {
  clearRegulationsData,
  clearRegulationsShapes,
  fetchRegulationsData,
  fetchRegulationsShapes,
  saveRegulationsData,
  saveRegulationsShapes,
} from '../api/client';

const { TextArea } = Input;

function RegulationsPage() {
  const [dataText, setDataText] = useState('');
  const [shapesText, setShapesText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchRegulationsData(), fetchRegulationsShapes()])
      .then(([data, shapes]) => {
        setDataText(data);
        setShapesText(shapes);
      })
      .catch(() => message.error('Не удалось загрузить регламенты'))
      .finally(() => setLoading(false));
  }, []);

  const save = async (type: 'data' | 'shapes') => {
    try {
      if (type === 'data') {
        await saveRegulationsData(dataText);
        message.success('Регламенты сохранены');
      } else {
        await saveRegulationsShapes(shapesText);
        message.success('Граф валидации сохранён');
      }
    } catch (e) {
      message.error('Не удалось сохранить');
    }
  };

  const clear = async (type: 'data' | 'shapes') => {
    try {
      if (type === 'data') {
        await clearRegulationsData();
        setDataText('');
      } else {
        await clearRegulationsShapes();
        setShapesText('');
      }
      message.success('Очищено');
    } catch (e) {
      message.error('Не удалось выполнить удаление');
    }
  };

  return (
    <div>
      <Typography.Title level={3}>Регламенты</Typography.Title>
      <Typography.Paragraph>
        Регламенты задают пороги и правила, по которым определяется уровень критичности и выдаются рекомендации.
      </Typography.Paragraph>
      {loading ? (
        <Spin />
      ) : (
        <Row gutter={16}>
          <Col span={12}>
            <Typography.Title level={5}>База регламентов</Typography.Title>
            <TextArea rows={18} value={dataText} onChange={(e) => setDataText(e.target.value)} />
            <Space style={{ marginTop: 8 }}>
              <Button type="primary" onClick={() => save('data')}>
                Сохранить регламенты
              </Button>
              <Button danger onClick={() => clear('data')}>
                Очистить регламенты
              </Button>
            </Space>
          </Col>
          <Col span={12}>
            <Typography.Title level={5}>Граф валидации (shapes)</Typography.Title>
            <TextArea rows={18} value={shapesText} onChange={(e) => setShapesText(e.target.value)} />
            <Space style={{ marginTop: 8 }}>
              <Button type="primary" onClick={() => save('shapes')}>
                Сохранить граф валидации
              </Button>
              <Button danger onClick={() => clear('shapes')}>
                Очистить граф валидации
              </Button>
            </Space>
          </Col>
        </Row>
      )}

      <Typography.Paragraph className="helper-text" style={{ marginTop: 16 }}>
        Здесь хранятся пороги и правила. Когда параметр сети выходит за пределы, Сигма выбирает подходящий
        регламент, присваивает level и предлагает recommendation диспетчеру.
      </Typography.Paragraph>
    </div>
  );
}

export default RegulationsPage;
