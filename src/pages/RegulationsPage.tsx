import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, Col, Row, Space, Typography } from 'antd';
import type { EditorFromTextArea } from 'codemirror';
import CodeMirror from 'codemirror';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/eclipse.css';
import 'codemirror/mode/turtle/turtle';
import 'codemirror/addon/mode/overlay';
import {
  clearRegulationsData,
  clearRegulationsShapes,
  createRegulationsData,
  createRegulationsShapes,
  fetchRegulationsData,
  fetchRegulationsShapes,
  updateRegulationsData,
  updateRegulationsShapes,
} from '../api/client';

function ensureOwlTurtleMode() {
  if ((CodeMirror as any).modes['turtle-owl-plus']) return;

  const keywordRegex = /^(?:@prefix|@base|prefix|base)\b/i;
  const entityRegex =
    /^(?:Ontology|Class|ObjectProperty|DataProperty|DatatypeProperty|AnnotationProperty|NamedIndividual|Individual|Literal|Datatype|Namespace|Prefix)\b/;
  const prefixRegex = /^[A-Za-z_][\w-]*:/;
  const iriRegex = /^<[^>]+>/;
  const literalRegex = /^"(?:[^"\\]|\\.)*"/;

  (CodeMirror as any).defineMode('turtle-owl-plus', (config: any) => {
    const baseMode = (CodeMirror as any).getMode(config, 'text/turtle');
    const overlay = {
      token(stream: any) {
        if (stream.match(keywordRegex)) return 'owl-keyword';
        if (stream.match(entityRegex)) return 'owl-entity';
        if (stream.match(prefixRegex)) return 'owl-prefix';
        if (stream.match(iriRegex)) return 'owl-iri';
        if (stream.match(literalRegex)) return 'owl-literal';
        while (stream.next() != null) {
          if (stream.match(keywordRegex, false)) break;
          if (stream.match(entityRegex, false)) break;
          if (stream.match(prefixRegex, false)) break;
          if (stream.match(iriRegex, false)) break;
          if (stream.match(literalRegex, false)) break;
        }
        return null;
      },
    };

    return (CodeMirror as any).overlayMode(baseMode, overlay);
  });
}

const editorSize = { width: '100%', height: '720px' };

const RegulationsPage: React.FC = () => {
  const [dataText, setDataText] = useState('');
  const [shapesText, setShapesText] = useState('');
  const [dataDirty, setDataDirty] = useState(false);
  const [shapesDirty, setShapesDirty] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [shapesLoading, setShapesLoading] = useState(false);
  const [status, setStatus] = useState<null | { type: 'info' | 'success' | 'error'; text: string }>(null);

  const dataTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const shapesTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const dataContainerRef = useRef<HTMLDivElement | null>(null);
  const shapesContainerRef = useRef<HTMLDivElement | null>(null);
  const dataEditorRef = useRef<EditorFromTextArea | null>(null);
  const shapesEditorRef = useRef<EditorFromTextArea | null>(null);
  const dataSilentChange = useRef(false);
  const shapesSilentChange = useRef(false);

  useEffect(() => {
    ensureOwlTurtleMode();
  }, []);

  useEffect(() => {
    if (dataTextareaRef.current && dataContainerRef.current && !dataEditorRef.current) {
      const editor = CodeMirror.fromTextArea(dataTextareaRef.current, {
        mode: 'turtle-owl-plus',
        theme: 'eclipse',
        lineNumbers: true,
        lineWrapping: true,
      });
      editor.setSize(editorSize.width, editorSize.height);
      if (dataContainerRef.current) {
        dataContainerRef.current.appendChild(editor.getWrapperElement());
      }
      editor.on('change', (instance) => {
        const value = instance.getValue();
        if (dataSilentChange.current) {
          dataSilentChange.current = false;
          setDataText(value);
          return;
        }
        setDataText(value);
        setDataDirty(true);
      });
      dataEditorRef.current = editor;
      setTimeout(() => editor.refresh(), 300);
    }

    if (shapesTextareaRef.current && shapesContainerRef.current && !shapesEditorRef.current) {
      const editor = CodeMirror.fromTextArea(shapesTextareaRef.current, {
        mode: 'turtle-owl-plus',
        theme: 'eclipse',
        lineNumbers: true,
        lineWrapping: true,
      });
      editor.setSize(editorSize.width, editorSize.height);
      if (shapesContainerRef.current) {
        shapesContainerRef.current.appendChild(editor.getWrapperElement());
      }
      editor.on('change', (instance) => {
        const value = instance.getValue();
        if (shapesSilentChange.current) {
          shapesSilentChange.current = false;
          setShapesText(value);
          return;
        }
        setShapesText(value);
        setShapesDirty(true);
      });
      shapesEditorRef.current = editor;
      setTimeout(() => editor.refresh(), 300);
    }

    const refreshEditors = () => {
      if (dataEditorRef.current) dataEditorRef.current.refresh();
      if (shapesEditorRef.current) shapesEditorRef.current.refresh();
    };
    window.addEventListener('resize', refreshEditors);
    return () => {
      window.removeEventListener('resize', refreshEditors);
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

  const updateEditorValue = (
    editorRef: React.MutableRefObject<EditorFromTextArea | null>,
    silentFlag: React.MutableRefObject<boolean>,
    value: string,
  ) => {
    if (editorRef.current) {
      silentFlag.current = true;
      editorRef.current.setValue(value);
    }
  };

  const extractError = (error: unknown) => {
    if (typeof error === 'string') return error;
    if (error && typeof error === 'object' && 'response' in error) {
      const err = error as any;
      return err.response?.data || err.message || 'Ошибка запроса';
    }
    return 'Ошибка запроса';
  };

  const loadData = async () => {
    setDataLoading(true);
    setStatus({ type: 'info', text: 'Загружаем базу регламентов…' });
    try {
      const text = await fetchRegulationsData();
      const normalized = typeof text === 'string' ? text : String(text ?? '');
      setDataText(normalized);
      setDataDirty(false);
      updateEditorValue(dataEditorRef, dataSilentChange, normalized);
      setStatus({ type: 'success', text: 'База регламентов загружена' });
    } catch (error) {
      setStatus({ type: 'error', text: extractError(error) });
    } finally {
      setDataLoading(false);
    }
  };

  const loadShapes = async () => {
    setShapesLoading(true);
    setStatus({ type: 'info', text: 'Загружаем граф валидации…' });
    try {
      const text = await fetchRegulationsShapes();
      const normalized = typeof text === 'string' ? text : String(text ?? '');
      setShapesText(normalized);
      setShapesDirty(false);
      updateEditorValue(shapesEditorRef, shapesSilentChange, normalized);
      setStatus({ type: 'success', text: 'Граф валидации загружен' });
    } catch (error) {
      setStatus({ type: 'error', text: extractError(error) });
    } finally {
      setShapesLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    loadShapes();
  }, []);

  const runWithStatus = async (
    action: () => Promise<any>,
    successText: string,
    loadingSetter: React.Dispatch<React.SetStateAction<boolean>>,
  ) => {
    loadingSetter(true);
    try {
      await action();
      setStatus({ type: 'success', text: successText });
    } catch (error) {
      setStatus({ type: 'error', text: extractError(error) });
    } finally {
      loadingSetter(false);
    }
  };

  const handleCreateData = () =>
    runWithStatus(async () => {
      await createRegulationsData(dataText);
      setDataDirty(false);
    }, 'База регламентов создана', setDataLoading);

  const handleUpdateData = () =>
    runWithStatus(async () => {
      await updateRegulationsData(dataText);
      setDataDirty(false);
    }, 'База регламентов обновлена', setDataLoading);

  const handleDeleteData = () => {
    if (!window.confirm('Удалить содержимое? Это действие необратимо')) return;
    runWithStatus(async () => {
      await clearRegulationsData();
      const cleared = '';
      setDataText(cleared);
      setDataDirty(false);
      updateEditorValue(dataEditorRef, dataSilentChange, cleared);
    }, 'База регламентов удалена', setDataLoading);
  };

  const handleCreateShapes = () =>
    runWithStatus(async () => {
      await createRegulationsShapes(shapesText);
      setShapesDirty(false);
    }, 'Граф валидации создан', setShapesLoading);

  const handleUpdateShapes = () =>
    runWithStatus(async () => {
      await updateRegulationsShapes(shapesText);
      setShapesDirty(false);
    }, 'Граф валидации обновлён', setShapesLoading);

  const handleDeleteShapes = () => {
    if (!window.confirm('Удалить содержимое? Это действие необратимо')) return;
    runWithStatus(async () => {
      await clearRegulationsShapes();
      const cleared = '';
      setShapesText(cleared);
      setShapesDirty(false);
      updateEditorValue(shapesEditorRef, shapesSilentChange, cleared);
    }, 'Граф валидации удалён', setShapesLoading);
  };

  const isDataEmpty = dataText.trim().length === 0;
  const isShapesEmpty = shapesText.trim().length === 0;

  return (
    <div>
      <Typography.Title level={2}>Цифровые регламенты</Typography.Title>
      <Typography.Paragraph type="secondary">
        Правила определяют критичность и формируют рекомендации. Граф валидации задаёт ограничения и проверки структуры
        данных.
      </Typography.Paragraph>
      <Typography.Paragraph className="helper-text" style={{ marginBottom: 16 }}>
        Регламенты задают пороги и условия, по которым система формирует уровни критичности и рекомендации. Граф
        валидации описывает проверки полноты и корректности данных для подсистем города.
      </Typography.Paragraph>

      {status && (
        <Alert
          style={{ marginBottom: 16 }}
          message={status.text}
          type={status.type}
          showIcon
        />
      )}

      <Row gutter={[16, 24]}>
        <Col xs={24} lg={12}>
          <Typography.Title level={4}>База регламентов</Typography.Title>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', marginTop: 8 }}>
            <textarea
              ref={dataTextareaRef}
              defaultValue={dataText}
              style={{ display: 'none' }}
              aria-label="Regulations"
            />
            <div ref={dataContainerRef} />
          </div>
          <Space style={{ marginTop: 12 }} wrap>
            <Button onClick={loadData} loading={dataLoading} disabled={dataLoading}>
              Загрузить
            </Button>
            <Button
              type="primary"
              onClick={handleCreateData}
              disabled={dataLoading || isDataEmpty}
              loading={dataLoading}
            >
              Создать
            </Button>
            <Button
              onClick={handleUpdateData}
              disabled={dataLoading || isDataEmpty}
              loading={dataLoading}
            >
              Обновить
            </Button>
            <Button danger onClick={handleDeleteData} disabled={dataLoading} loading={dataLoading}>
              Удалить
            </Button>
            {dataDirty && <Typography.Text type="warning">Есть несохранённые изменения</Typography.Text>}
          </Space>
        </Col>

        <Col xs={24} lg={12}>
          <Typography.Title level={4}>Граф валидации</Typography.Title>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', marginTop: 8 }}>
            <textarea
              ref={shapesTextareaRef}
              defaultValue={shapesText}
              style={{ display: 'none' }}
              aria-label="Validation Shapes"
            />
            <div ref={shapesContainerRef} />
          </div>
          <Space style={{ marginTop: 12 }} wrap>
            <Button onClick={loadShapes} loading={shapesLoading} disabled={shapesLoading}>
              Загрузить
            </Button>
            <Button
              type="primary"
              onClick={handleCreateShapes}
              disabled={shapesLoading || isShapesEmpty}
              loading={shapesLoading}
            >
              Создать
            </Button>
            <Button
              onClick={handleUpdateShapes}
              disabled={shapesLoading || isShapesEmpty}
              loading={shapesLoading}
            >
              Обновить
            </Button>
            <Button danger onClick={handleDeleteShapes} disabled={shapesLoading} loading={shapesLoading}>
              Удалить
            </Button>
            {shapesDirty && <Typography.Text type="warning">Есть несохранённые изменения</Typography.Text>}
          </Space>
        </Col>
      </Row>
    </div>
  );
};

export default RegulationsPage;
