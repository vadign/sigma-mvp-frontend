import React, { useEffect, useRef, useState } from 'react';
import { Button, Col, Row, Space, Spin, Typography, message } from 'antd';
import {
  clearRegulationsData,
  clearRegulationsShapes,
  fetchRegulationsData,
  fetchRegulationsShapes,
  saveRegulationsData,
  saveRegulationsShapes,
} from '../api/client';
import type { EditorFromTextArea } from 'codemirror';
import CodeMirror from 'codemirror';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/eclipse.css';
import 'codemirror/mode/turtle/turtle';

function RegulationsPage() {
  const [dataText, setDataText] = useState('');
  const [shapesText, setShapesText] = useState('');
  const [loading, setLoading] = useState(false);
  const dataTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const shapesTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const dataEditorRef = useRef<EditorFromTextArea | null>(null);
  const shapesEditorRef = useRef<EditorFromTextArea | null>(null);

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

  useEffect(() => {
    if (dataTextareaRef.current && !dataEditorRef.current) {
      const editor = CodeMirror.fromTextArea(dataTextareaRef.current, {
        mode: 'text/turtle',
        theme: 'eclipse',
        lineNumbers: true,
        lineWrapping: true,
      });
      editor.on('change', (instance) => {
        setDataText(instance.getValue());
      });
      editor.setSize('100%', '420px');
      dataEditorRef.current = editor;
    }
    if (shapesTextareaRef.current && !shapesEditorRef.current) {
      const editor = CodeMirror.fromTextArea(shapesTextareaRef.current, {
        mode: 'text/turtle',
        theme: 'eclipse',
        lineNumbers: true,
        lineWrapping: true,
      });
      editor.on('change', (instance) => {
        setShapesText(instance.getValue());
      });
      editor.setSize('100%', '420px');
      shapesEditorRef.current = editor;
    }
    return () => {
      if (dataEditorRef.current) {
        dataEditorRef.current.toTextArea();
        dataEditorRef.current = null;
      }
      if (shapesEditorRef.current) {
        shapesEditorRef.current.toTextArea();
        shapesEditorRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (dataEditorRef.current && dataEditorRef.current.getValue() !== dataText) {
      dataEditorRef.current.setValue(dataText);
    }
  }, [dataText]);

  useEffect(() => {
    if (shapesEditorRef.current && shapesEditorRef.current.getValue() !== shapesText) {
      shapesEditorRef.current.setValue(shapesText);
    }
  }, [shapesText]);

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
            <textarea
              ref={dataTextareaRef}
              defaultValue={dataText}
              style={{ display: 'none' }}
              aria-label="Текст регламентов"
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
            <textarea
              ref={shapesTextareaRef}
              defaultValue={shapesText}
              style={{ display: 'none' }}
              aria-label="Граф валидации"
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
