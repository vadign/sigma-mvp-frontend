import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, Col, Modal, Row, Space, Typography, message } from 'antd';
import type { EditorFromTextArea } from 'codemirror';
import CodeMirror from 'codemirror';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/eclipse.css';
import 'codemirror/mode/turtle/turtle';
import 'codemirror/addon/mode/overlay';
import {
  buildCodeFrame,
  parseFusekiDescription,
  readErrorPayload,
  tryLocateCaretColumn,
} from '../utils/regulationErrors';
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

type ErrorModalState = {
  visible: boolean;
  title: string;
  subtitle?: string;
  message?: string;
  line?: number;
  caretColumn?: number;
  codeFrame?: { startLine: number; lines: string[] };
  validationDetails?: { loc: string; msg: string }[];
  rawText?: string;
  copyText?: string;
};

const RegulationsPanel: React.FC = () => {
  const [dataText, setDataText] = useState('');
  const [shapesText, setShapesText] = useState('');
  const [dataDirty, setDataDirty] = useState(false);
  const [shapesDirty, setShapesDirty] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [shapesLoading, setShapesLoading] = useState(false);
  const [status, setStatus] = useState<null | { type: 'info' | 'success' | 'error'; text: string }>(null);
  const [dataExists, setDataExists] = useState(false);
  const [shapesExists, setShapesExists] = useState(false);
  const [errorModal, setErrorModal] = useState<ErrorModalState | null>(null);

  const dataTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const shapesTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const dataEditorRef = useRef<EditorFromTextArea | null>(null);
  const shapesEditorRef = useRef<EditorFromTextArea | null>(null);
  const dataSilentChange = useRef(false);
  const shapesSilentChange = useRef(false);

  useEffect(() => {
    ensureOwlTurtleMode();
  }, []);

  useEffect(() => {
    if (dataTextareaRef.current && !dataEditorRef.current) {
      const editor = CodeMirror.fromTextArea(dataTextareaRef.current, {
        mode: 'turtle-owl-plus',
        theme: 'eclipse',
        lineNumbers: true,
        lineWrapping: true,
      });
      editor.setSize(editorSize.width, editorSize.height);
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

    if (shapesTextareaRef.current && !shapesEditorRef.current) {
      const editor = CodeMirror.fromTextArea(shapesTextareaRef.current, {
        mode: 'turtle-owl-plus',
        theme: 'eclipse',
        lineNumbers: true,
        lineWrapping: true,
      });
      editor.setSize(editorSize.width, editorSize.height);
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

  const buildCopyText = (info: ErrorModalState): string => {
    const parts: string[] = [];
    parts.push(info.title);
    if (info.subtitle) parts.push(info.subtitle);
    if (info.message) parts.push(info.message);
    if (info.validationDetails?.length) {
      parts.push('Детали:');
      info.validationDetails.forEach((d) => parts.push(`- ${d.loc}: ${d.msg}`));
    }
    if (info.codeFrame) {
      parts.push('Фрагмент:');
      info.codeFrame.lines.forEach((line, idx) => {
        const lineNumber = info.codeFrame!.startLine + idx;
        parts.push(`${lineNumber}: ${line}`);
      });
    }
    if (info.rawText) parts.push(`Сырой ответ: ${info.rawText}`);
    return parts.join('\n');
  };

  const handleRegulationError = async (error: unknown, editorText: string, fallbackTitle: string) => {
    const payload = await readErrorPayload(error as any);
    const description = typeof payload.json?.description === 'string' ? payload.json.description : undefined;
    const detail = payload.json?.detail;

    if (Array.isArray(detail)) {
      const validationDetails = detail.map((d: any) => ({
        loc: Array.isArray(d?.loc) ? d.loc.join('.') : String(d?.loc ?? ''),
        msg: d?.msg || d?.message || 'Ошибка поля',
      }));
      const modalInfo: ErrorModalState = {
        visible: true,
        title: 'Ошибка валидации запроса',
        message: 'Проверьте заполнение полей и формат тела запроса.',
        validationDetails,
        rawText: payload.rawText ?? JSON.stringify(payload.json, null, 2),
      };
      modalInfo.copyText = buildCopyText(modalInfo);
      setErrorModal(modalInfo);
      return modalInfo.message;
    }

    if (description) {
      const parsed = parseFusekiDescription(description);
      const caretColumn = tryLocateCaretColumn(description);
      const codeFrame = parsed.line ? buildCodeFrame(editorText, parsed.line, 3) : undefined;
      const modalInfo: ErrorModalState = {
        visible: true,
        title: 'Ошибка синтаксиса регламента',
        subtitle: parsed.line ? `Строка ${parsed.line}` : undefined,
        message: parsed.message,
        line: parsed.line,
        caretColumn,
        codeFrame,
        rawText: payload.rawText ?? description,
      };
      modalInfo.copyText = buildCopyText(modalInfo);
      setErrorModal(modalInfo);
      return parsed.message;
    }

    const fallbackText = payload.rawText || (payload.json ? JSON.stringify(payload.json, null, 2) : undefined);
    const modalInfo: ErrorModalState = {
      visible: true,
      title: payload.status === 400 || payload.status === 422 ? 'Ошибка сохранения' : 'Ошибка запроса',
      message: fallbackText || fallbackTitle,
      rawText: fallbackText,
    };
    modalInfo.copyText = buildCopyText(modalInfo);
    setErrorModal(modalInfo);
    return modalInfo.message;
  };

  const loadData = async () => {
    setDataLoading(true);
    setStatus({ type: 'info', text: 'Загружаем базу регламентов…' });
    try {
      const text = await fetchRegulationsData();
      const normalized = typeof text === 'string' ? text : String(text ?? '');
      setDataText(normalized);
      setDataDirty(false);
      setDataExists(normalized.trim().length > 0);
      updateEditorValue(dataEditorRef, dataSilentChange, normalized);
      setStatus({ type: 'success', text: 'База регламентов загружена' });
    } catch (error) {
      setStatus({ type: 'error', text: 'Не удалось загрузить базу регламентов' });
      await handleRegulationError(error, dataText, 'Ошибка загрузки регламента');
      setDataExists(false);
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
      setShapesExists(normalized.trim().length > 0);
      updateEditorValue(shapesEditorRef, shapesSilentChange, normalized);
      setStatus({ type: 'success', text: 'Граф валидации загружен' });
    } catch (error) {
      setStatus({ type: 'error', text: 'Не удалось загрузить граф валидации' });
      await handleRegulationError(error, shapesText, 'Ошибка загрузки графа');
      setShapesExists(false);
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
    errorContext?: { editorText: string; fallbackTitle: string },
  ) => {
    loadingSetter(true);
    try {
      await action();
      setStatus({ type: 'success', text: successText });
    } catch (error) {
      setStatus({ type: 'error', text: errorContext?.fallbackTitle || 'Ошибка сохранения' });
      if (errorContext) {
        await handleRegulationError(error, errorContext.editorText, errorContext.fallbackTitle);
      } else {
        await handleRegulationError(error, '', 'Ошибка сохранения');
      }
    } finally {
      loadingSetter(false);
    }
  };

  const handleCreateData = () =>
    runWithStatus(async () => {
      await createRegulationsData(dataText);
      setDataDirty(false);
      setDataExists(true);
    }, 'База регламентов создана', setDataLoading, {
      editorText: dataText,
      fallbackTitle: 'Не удалось создать базу регламентов',
    });

  const handleUpdateData = () =>
    runWithStatus(async () => {
      await updateRegulationsData(dataText);
      setDataDirty(false);
      setDataExists(true);
    }, 'База регламентов обновлена', setDataLoading, {
      editorText: dataText,
      fallbackTitle: 'Не удалось обновить базу регламентов',
    });

  const handleDeleteData = () => {
    if (!window.confirm('Удалить содержимое? Это действие необратимо')) return;
    runWithStatus(async () => {
      await clearRegulationsData();
      const cleared = '';
      setDataText(cleared);
      setDataDirty(false);
      setDataExists(false);
      updateEditorValue(dataEditorRef, dataSilentChange, cleared);
    }, 'База регламентов удалена', setDataLoading, {
      editorText: dataText,
      fallbackTitle: 'Не удалось удалить базу регламентов',
    });
  };

  const handleCreateShapes = () =>
    runWithStatus(async () => {
      await createRegulationsShapes(shapesText);
      setShapesDirty(false);
      setShapesExists(true);
    }, 'Граф валидации создан', setShapesLoading, {
      editorText: shapesText,
      fallbackTitle: 'Не удалось создать граф валидации',
    });

  const handleUpdateShapes = () =>
    runWithStatus(async () => {
      await updateRegulationsShapes(shapesText);
      setShapesDirty(false);
      setShapesExists(true);
    }, 'Граф валидации обновлён', setShapesLoading, {
      editorText: shapesText,
      fallbackTitle: 'Не удалось обновить граф валидации',
    });

  const handleDeleteShapes = () => {
    if (!window.confirm('Удалить содержимое? Это действие необратимо')) return;
    runWithStatus(async () => {
      await clearRegulationsShapes();
      const cleared = '';
      setShapesText(cleared);
      setShapesDirty(false);
      setShapesExists(false);
      updateEditorValue(shapesEditorRef, shapesSilentChange, cleared);
    }, 'Граф валидации удалён', setShapesLoading, {
      editorText: shapesText,
      fallbackTitle: 'Не удалось удалить граф валидации',
    });
  };

  const isDataEmpty = dataText.trim().length === 0;
  const isShapesEmpty = shapesText.trim().length === 0;

  const handleCopyDetails = async () => {
    if (!errorModal?.copyText) return;
    try {
      await navigator.clipboard.writeText(errorModal.copyText);
      message.success('Детали скопированы');
    } catch (e) {
      message.error('Не удалось скопировать детали');
    }
  };

  const renderCodeFrame = () => {
    if (!errorModal?.codeFrame) return null;
    return (
      <div style={{ marginTop: 12 }}>
        <Typography.Text strong>Фрагмент</Typography.Text>
        <div
          style={{
            background: '#0f172a',
            color: '#e2e8f0',
            padding: 12,
            borderRadius: 6,
            marginTop: 8,
            fontFamily: 'ui-monospace, SFMono-Regular, SFMono, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            overflowX: 'auto',
          }}
        >
          {errorModal.codeFrame.lines.map((line, idx) => {
            const lineNumber = (errorModal.codeFrame?.startLine || 1) + idx;
            const isTargetLine = errorModal.line != null && lineNumber === errorModal.line;
            const caretColumn = isTargetLine ? errorModal.caretColumn : undefined;
            let highlighted: React.ReactNode = line;

            if (isTargetLine && caretColumn && caretColumn >= 1) {
              const colIndex = caretColumn - 1;
              const safeLine = line ?? '';
              const before = safeLine.slice(0, colIndex);
              const char = safeLine[colIndex] ?? ' ';
              const after = safeLine.slice(colIndex + 1);
              highlighted = (
                <>
                  {before}
                  <mark style={{ background: '#f59e0b', color: '#111827' }}>{char || ' '}</mark>
                  {after}
                </>
              );
            }

            return (
              <div key={lineNumber} style={{ display: 'flex', gap: 8 }}>
                <div style={{ minWidth: 48, color: isTargetLine ? '#fbbf24' : '#94a3b8', textAlign: 'right' }}>
                  {lineNumber}
                </div>
                <div style={{ whiteSpace: 'pre-wrap', flex: 1, color: isTargetLine ? '#fff' : '#e2e8f0' }}>{highlighted}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      <Modal
        open={!!errorModal}
        onCancel={() => setErrorModal(null)}
        title={errorModal?.title}
        width={720}
        footer={[
          <Button key="copy" onClick={handleCopyDetails} disabled={!errorModal?.copyText}>
            Скопировать детали
          </Button>,
          <Button key="close" type="primary" onClick={() => setErrorModal(null)}>
            Закрыть
          </Button>,
        ]}
      >
        {errorModal?.subtitle && <Typography.Title level={5}>{errorModal.subtitle}</Typography.Title>}
        {errorModal?.message && (
          <Typography.Paragraph style={{ marginBottom: 8 }}>{errorModal.message}</Typography.Paragraph>
        )}

        {errorModal?.validationDetails && (
          <div style={{ marginBottom: 12 }}>
            <Typography.Text strong>Детали:</Typography.Text>
            <ul style={{ paddingLeft: 18, marginTop: 6 }}>
              {errorModal.validationDetails.map((item, idx) => (
                <li key={`${item.loc}-${idx}`}>
                  <Typography.Text>
                    {item.loc}: {item.msg}
                  </Typography.Text>
                </li>
              ))}
            </ul>
          </div>
        )}

        {renderCodeFrame()}

        {errorModal?.rawText && (
          <div style={{ marginTop: 12 }}>
            <Typography.Text strong>Текст ответа</Typography.Text>
            <pre className="error-raw">
              {errorModal.rawText}
            </pre>
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <Typography.Text strong>Что проверить:</Typography.Text>
          <ul style={{ paddingLeft: 18, marginTop: 6 }}>
            <li>точки и точки с запятой в Turtle;</li>
            <li>кавычки строковых значений;</li>
            <li>корректность префиксов PREFIX и использования двоеточий;</li>
            <li>отсутствие отрицательных значений там, где ожидаются неотрицательные (например, pressureDeviation).</li>
          </ul>
        </div>
      </Modal>

      <Typography.Title level={2} className="page-title">
        Цифровые регламенты
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        Правила определяют критичность и формируют рекомендации. Граф валидации задаёт ограничения и проверки структуры
        данных.
      </Typography.Paragraph>
      <Typography.Paragraph className="helper-text" style={{ marginBottom: 16 }}>
        Регламенты задают пороги и условия, по которым система формирует уровни критичности и рекомендации. Граф
        валидации описывает проверки полноты и корректности данных для подсистем города.
      </Typography.Paragraph>

      {status && <Alert className="status-alert" message={status.text} type={status.type} showIcon />}

      <Row gutter={[16, 24]}>
        <Col xs={24} lg={12}>
          <Typography.Title level={4}>База регламентов</Typography.Title>
          <div className="editor-shell">
            <textarea
              ref={dataTextareaRef}
              defaultValue={dataText}
              style={{ display: 'none' }}
              aria-label="Regulations"
            />
          </div>
          <Space style={{ marginTop: 12 }} wrap>
            <Button onClick={loadData} loading={dataLoading} disabled={dataLoading || dataExists}>
              Загрузить
            </Button>
            <Button
              type="primary"
              onClick={handleCreateData}
              disabled={dataLoading || isDataEmpty || dataExists}
              loading={dataLoading}
            >
              Создать
            </Button>
            <Button
              onClick={handleUpdateData}
              disabled={dataLoading || !dataExists || isDataEmpty || !dataDirty}
              loading={dataLoading}
            >
              Обновить
            </Button>
            <Button danger onClick={handleDeleteData} disabled={dataLoading || !dataExists} loading={dataLoading}>
              Удалить
            </Button>
            {dataDirty && <Typography.Text type="warning">Есть несохранённые изменения</Typography.Text>}
          </Space>
        </Col>

        <Col xs={24} lg={12}>
          <Typography.Title level={4}>Граф валидации</Typography.Title>
          <div className="editor-shell">
            <textarea
              ref={shapesTextareaRef}
              defaultValue={shapesText}
              style={{ display: 'none' }}
              aria-label="Validation Shapes"
            />
          </div>
          <Space style={{ marginTop: 12 }} wrap>
            <Button onClick={loadShapes} loading={shapesLoading} disabled={shapesLoading || shapesExists}>
              Загрузить
            </Button>
            <Button
              type="primary"
              onClick={handleCreateShapes}
              disabled={shapesLoading || isShapesEmpty || shapesExists}
              loading={shapesLoading}
            >
              Создать
            </Button>
            <Button
              onClick={handleUpdateShapes}
              disabled={shapesLoading || !shapesExists || isShapesEmpty || !shapesDirty}
              loading={shapesLoading}
            >
              Обновить
            </Button>
            <Button danger onClick={handleDeleteShapes} disabled={shapesLoading || !shapesExists} loading={shapesLoading}>
              Удалить
            </Button>
            {shapesDirty && <Typography.Text type="warning">Есть несохранённые изменения</Typography.Text>}
          </Space>
        </Col>
      </Row>
    </>
  );
};

export default RegulationsPanel;
