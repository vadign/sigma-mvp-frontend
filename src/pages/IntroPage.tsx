import { Card, Col, Row, Typography, List } from 'antd';

const talkingPoints = [
  'Подчеркнуть, что все данные собираются автоматически из городских подсистем.',
  'Показать, что регламенты задаются специалистами и применяются без участия операторов.',
  'Описать, как рекомендации помогают диспетчерам принимать решение быстрее.',
  'Обратить внимание на совместный доступ: мэр, операторы и службы видят одну картину.',
];

function IntroPage() {
  return (
    <div>
      <Typography.Title>Сигма: от событий к управленческим решениям</Typography.Title>
      <Typography.Paragraph style={{ fontSize: 16, maxWidth: 900 }}>
        Сигма собирает информацию о событиях из разных подсистем города (теплосети, дорожные камеры,
        датчики шума, качество воздуха). Приводит данные к стандартному виду, применяет цифровые
        регламенты, оценивая критичность, и формирует рекомендации для диспетчеров и руководителей.
      </Typography.Paragraph>

      <Row gutter={16} style={{ marginTop: 24 }}>
        <Col span={8}>
          <Card title="Информирование" bordered>
            Единый журнал событий и отклонений на дашбордах.
          </Card>
        </Col>
        <Col span={8}>
          <Card title="Цифровые регламенты" bordered>
            Правила, по которым автоматически определяется критичность и предлагаются действия.
          </Card>
        </Col>
        <Col span={8}>
          <Card title="Управленческие решения" bordered>
            Мэр и руководители видят главные проблемы и динамику по подсистемам.
          </Card>
        </Col>
      </Row>

      <div className="page-section">
        <Typography.Title level={4}>Шпаргалка для докладчика</Typography.Title>
        <List
          dataSource={talkingPoints}
          renderItem={(item) => <List.Item>{item}</List.Item>}
          bordered
          style={{ maxWidth: 900 }}
        />
      </div>
    </div>
  );
}

export default IntroPage;
