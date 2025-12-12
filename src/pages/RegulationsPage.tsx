import React, { useEffect, useMemo, useState } from 'react';
import { Button, Col, Row, Space, Spin, Typography, message } from 'antd';
import {
  clearRegulationsData,
  clearRegulationsShapes,
  fetchRegulationsData,
  fetchRegulationsShapes,
  saveRegulationsData,
  saveRegulationsShapes,
} from '../api/client';
import CodeEditor from '@uiw/react-textarea-code-editor';
import 'prismjs/themes/prism.css';
import '@uiw/react-textarea-code-editor/dist.css';

const editorStyle: React.CSSProperties = {
  fontFamily: 'Menlo, Monaco, Consolas, "Courier New", monospace',
  minHeight: 360,
  borderRadius: 8,
  padding: 12,
};

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

  const memoizedStyle = useMemo(() => ({ ...editorStyle }), []);

  return (
    <div>
      <Typography.Title level={3}>Регламенты</Typography.Title>
      <Typography.Paragraph>
        Регламенты задают пороги и правила, по которым определяется уровень критичности и выдаются рекомендации.
      </Typography.Paragraph>
      <Typography.Paragraph className="helper-text" style={{ marginBottom: 16 }}>
        Когда параметр сети выходит за пределы, Сигма выбирает подходящий регламент, присваивает уровень критичности
        и предлагает рекомендацию к действиям диспетчеру.
      </Typography.Paragraph>
      {loading ? (
        <Spin />
      ) : (
        <Row gutter={16}>
          <Col span={12}>
            <Typography.Title level={5}>База регламентов</Typography.Title>
            <CodeEditor
              value={dataText}
              language="turtle"
              placeholder="Вставьте содержимое базы регламентов"
              onChange={(event) => setDataText(event.target.value)}
              padding={12}
              style={memoizedStyle}
            />
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
            <CodeEditor
              value={shapesText}
              language="turtle"
              placeholder="Вставьте граф валидации (shapes)"
              onChange={(event) => setShapesText(event.target.value)}
              padding={12}
              style={memoizedStyle}
            />
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
    </div>
  );
}

export default RegulationsPage;
