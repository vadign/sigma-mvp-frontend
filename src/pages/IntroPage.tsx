import { Card, Col, Row, Typography } from 'antd';

const { Title, Paragraph, Text } = Typography;

function IntroPage() {
  return (
    <div style={{ background: '#f7f8fa', minHeight: '100%', padding: '40px 24px' }}>
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          background: '#fff',
          padding: '40px 32px',
          borderRadius: 12,
          boxShadow: '0 8px 24px rgba(0,0,0,0.04)',
        }}
      >
        <section style={{ marginBottom: 32 }}>
          <Title level={1} style={{ marginBottom: 16 }}>
            Сигма: от событий в городе к управленческим решениям
          </Title>
          <Paragraph style={{ fontSize: 18, marginBottom: 16 }}>
            Сигма собирает информацию о событиях из разных городских подсистем — теплосети, дорожные
            камеры, датчики шума и качества воздуха — приводит их к единому виду, проверяет по цифровым
            регламентам и помогает диспетчерам и руководству своевременно реагировать на проблемы.
          </Paragraph>
          <Paragraph style={{ fontSize: 16, color: '#4a4a4a', maxWidth: 980 }}>
            Фреймворк «Сигма» — основа решений «умного города». В пилотном проекте используются данные
            теплосетей, дорожных камер, датчиков шума и воздуха. Система говорит на понятном управленцам
            языке: что происходит, насколько это критично и что делать дальше.
          </Paragraph>
        </section>

        <section style={{ marginTop: 24 }}>
          <Title level={3} style={{ marginBottom: 16 }}>
            Три ключевые функции Сигмы
          </Title>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Card
                title="Информирование"
                bordered
                headStyle={{ fontSize: 18, fontWeight: 600 }}
                bodyStyle={{ minHeight: 260 }}
              >
                <Text strong style={{ display: 'block', marginBottom: 8 }}>
                  Единый взгляд на события и инциденты в городской среде
                </Text>
                <ul style={{ paddingLeft: 18, marginBottom: 0 }}>
                  <li>Собирает события из теплосетей, дорог, экологии, ЖКХ и других подсистем.</li>
                  <li>Приводит их к единому стандарту для сравнения и анализа.</li>
                  <li>Показывает ленту, карту и фильтры по районам, подсистемам и критичности.</li>
                  <li>Автоматически информирует ответственных: уведомления, сводки и отчёты.</li>
                </ul>
              </Card>
            </Col>

            <Col xs={24} md={8}>
              <Card
                title="Предложение решений"
                bordered
                headStyle={{ fontSize: 18, fontWeight: 600 }}
                bodyStyle={{ minHeight: 260 }}
              >
                <Text strong style={{ display: 'block', marginBottom: 8 }}>
                  Рекомендации по действию на основе цифровых регламентов
                </Text>
                <ul style={{ paddingLeft: 18, marginBottom: 0 }}>
                  <li>Проверяет параметры каждого события по цифровым регламентам и нормам.</li>
                  <li>Определяет уровень критичности: что можно отложить, а что требует реакции сейчас.</li>
                  <li>Формирует понятные рекомендации: что сделать, в каком порядке и кем.</li>
                  <li>Показывает, на какой регламент опирается решение, фиксирует сроки реагирования.</li>
                </ul>
              </Card>
            </Col>

            <Col xs={24} md={8}>
              <Card
                title="Прогнозирование и моделирование"
                bordered
                headStyle={{ fontSize: 18, fontWeight: 600 }}
                bodyStyle={{ minHeight: 260 }}
              >
                <Text strong style={{ display: 'block', marginBottom: 8 }}>
                  Переход от реакции на проблемы к их предупреждению
                </Text>
                <ul style={{ paddingLeft: 18, marginBottom: 0 }}>
                  <li>Анализирует историю событий, аварий и время реагирования служб.</li>
                  <li>Находит проблемные зоны и повторяющиеся сценарии по районам и подсистемам.</li>
                  <li>Поддерживает моделирование: рост нагрузки, изменение схем движения, отказ оборудования.</li>
                  <li>Даёт основу для прогнозов и планирования ремонтов, экологии и транспорта.</li>
                  <li>Позволяет проверять регламенты и решения на моделях до применения в городе.</li>
                </ul>
              </Card>
            </Col>
          </Row>
        </section>
      </div>
    </div>
  );
}

export default IntroPage;
