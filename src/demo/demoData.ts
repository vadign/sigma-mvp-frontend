import { EventResponse } from '../api/types';
import { AGENTS, AgentDefinition, AgentId, STALE_DATA_THRESHOLD_MINUTES } from '../utils/agents';

export interface DemoAgent {
  id: AgentId;
  name: string;
  responsibilityZone: string;
  isPaused?: boolean;
}

interface DemoEventDefinition {
  id: number;
  agentId: AgentId;
  minutesAgo: number;
  updatedMinutesAgo: number;
  title: string;
  description: string;
  level: 1 | 2 | 3;
  status: 'New' | 'InProgress' | 'Resolved' | 'Closed';
  requiresAttention: boolean;
  location: {
    address: string;
    lat?: number;
    lon?: number;
  };
  source: {
    systemName: string;
    sensorId: string;
  };
  recommendations: string[];
}

export interface DemoEventOverride extends Omit<DemoEventDefinition, 'minutesAgo' | 'updatedMinutesAgo'> {
  createdAt?: string;
  updatedAt?: string;
  minutesAgo?: number;
  updatedMinutesAgo?: number;
}

export interface DemoActionLogEntry {
  id: string;
  agentId: AgentId;
  actionType: 'notify' | 'assign_task' | 'request_info' | 'create_document' | 'escalate' | 'auto_close' | 'comment';
  timestamp: string;
  summary: string;
  relatedEventId: number;
  resultStatus: 'success' | 'pending' | 'failed';
}

interface DemoActionLogDefinition {
  id: string;
  agentId: AgentId;
  actionType: DemoActionLogEntry['actionType'];
  minutesAgo: number;
  summary: string;
  relatedEventId: number;
  resultStatus: DemoActionLogEntry['resultStatus'];
}

export interface DemoTaskDecision {
  id: string;
  agentId: AgentId;
  title: string;
  createdAt: string;
  dueAt: string;
  status: 'Created' | 'InProgress' | 'Done' | 'Overdue';
  assignee: string;
  priority: 'Высокий' | 'Средний' | 'Низкий';
  linkedEventIds: number[];
}

interface DemoTaskDecisionDefinition {
  id: string;
  agentId: AgentId;
  title: string;
  createdMinutesAgo: number;
  dueInMinutes: number;
  status: DemoTaskDecision['status'];
  assignee: string;
  priority: DemoTaskDecision['priority'];
  linkedEventIds: number[];
}

export interface DemoTimeseriesPoint {
  timestamp: string;
  values: Record<string, number>;
}

type AgentFlags = Partial<Record<AgentId, boolean>>;

const DOMAIN_LABELS: Record<AgentId, string> = {
  heat: 'Теплосети',
  air: 'Качество воздуха',
  noise: 'Шум',
};

export const HEAT_REGULATION = {
  name: 'Регламент на допустимые параметры давления и диаметра для трубопроводов водоснабжения',
  date: '2023-10-01',
  pressure: 20.5,
  diameter: 0.5,
  pressureDeviation: 1.5,
  diameterDeviation: 0.2,
  recommendation:
    'Остановите систему, проверьте герметичность трубопровода на наличие утечек и проведите необходимый ремонт.',
};

const DEMO_EVENT_DEFINITIONS: DemoEventDefinition[] = [
  {
    id: 101,
    agentId: 'heat',
    minutesAgo: 6,
    updatedMinutesAgo: 3,
    title: 'Прорыв на магистрали М-3',
    description: 'Падение давления 8.2 → 4.1 bar, риск отключения квартала.',
    level: 1,
    status: 'New',
    requiresAttention: true,
    location: { address: 'Магистраль М-3, км 14', lat: 59.9342, lon: 30.3189 },
    source: { systemName: 'HeatWatch', sensorId: 'HW-903' },
    recommendations: ['Изолировать поврежденный участок', 'Поднять резервный насос', 'Оповестить аварийную службу'],
  },
  {
    id: 102,
    agentId: 'heat',
    minutesAgo: 14,
    updatedMinutesAgo: 8,
    title: 'Отклонение температуры подачи на ЦТП-12',
    description: 'Температура подачи выше нормы на 9°C, нужен пересчет баланса.',
    level: 2,
    status: 'InProgress',
    requiresAttention: true,
    location: { address: 'ЦТП-12, ул. Садовая, 18', lat: 59.9321, lon: 30.3619 },
    source: { systemName: 'ThermoPulse', sensorId: 'TP-112' },
    recommendations: ['Проверить клапан смешения', 'Скорректировать график подачи', 'Сверить показания с архивом'],
  },
  {
    id: 103,
    agentId: 'heat',
    minutesAgo: 28,
    updatedMinutesAgo: 20,
    title: 'Неустойчивый перепад давления на узле У-7',
    description: 'Колебания 0.8–1.5 bar, возможна кавитация на насосе.',
    level: 2,
    status: 'InProgress',
    requiresAttention: true,
    location: { address: 'Узел У-7, пр-т Ленина, 94', lat: 59.9362, lon: 30.3251 },
    source: { systemName: 'HydroScan', sensorId: 'HY-077' },
    recommendations: ['Проверить насосный агрегат', 'Оценить подпитку', 'Усилить мониторинг'],
  },
  {
    id: 104,
    agentId: 'heat',
    minutesAgo: 42,
    updatedMinutesAgo: 36,
    title: 'Подозрение на некорректные показания датчика P-204',
    description: 'Разброс показаний на 18%, вероятна калибровка.',
    level: 3,
    status: 'New',
    requiresAttention: false,
    location: { address: 'ул. Пушкина, 5', lat: 59.9343, lon: 30.3326 },
    source: { systemName: 'HeatWatch', sensorId: 'P-204' },
    recommendations: ['Запросить сервис датчика', 'Сверить с резервным каналом', 'Отметить в журнале'],
  },
  {
    id: 105,
    agentId: 'heat',
    minutesAgo: 58,
    updatedMinutesAgo: 50,
    title: 'Рост утечек теплоносителя',
    description: 'Прогноз утечки на квартальной магистрали, рост потерь 4%.',
    level: 2,
    status: 'New',
    requiresAttention: true,
    location: { address: 'ул. Рубинштейна, 30', lat: 59.9271, lon: 30.3471 },
    source: { systemName: 'HydroScan', sensorId: 'HY-309' },
    recommendations: ['Запросить выезд бригады', 'Закрепить место утечки', 'Контроль давления каждые 10 мин'],
  },
  {
    id: 106,
    agentId: 'heat',
    minutesAgo: 75,
    updatedMinutesAgo: 70,
    title: 'Вибрация на насосной станции НС-4',
    description: 'Рост вибрации выше порога на 12%.',
    level: 2,
    status: 'InProgress',
    requiresAttention: true,
    location: { address: 'НС-4, наб. Фонтанки, 24', lat: 59.9286, lon: 30.3373 },
    source: { systemName: 'ThermoPulse', sensorId: 'TP-331' },
    recommendations: ['Проверить подшипники', 'Оценить нагрузку насоса', 'Подготовить резервный контур'],
  },
  {
    id: 107,
    agentId: 'heat',
    minutesAgo: 92,
    updatedMinutesAgo: 80,
    title: 'Снижение температуры обратки',
    description: 'Обратка ниже нормы на 6°C, возможен перерасход.',
    level: 3,
    status: 'InProgress',
    requiresAttention: false,
    location: { address: 'ул. Марата, 9', lat: 59.925, lon: 30.3528 },
    source: { systemName: 'HeatWatch', sensorId: 'HW-188' },
    recommendations: ['Проверить балансировку', 'Сравнить с режимом прошлого дня', 'Сообщить сменному инженеру'],
  },
  {
    id: 108,
    agentId: 'heat',
    minutesAgo: 118,
    updatedMinutesAgo: 110,
    title: 'Провал расхода на ветке В-2',
    description: 'Расход снизился на 15% относительно нормы.',
    level: 2,
    status: 'Resolved',
    requiresAttention: false,
    location: { address: 'ветка В-2, ул. Савушкина, 45', lat: 59.9889, lon: 30.2193 },
    source: { systemName: 'HydroScan', sensorId: 'HY-410' },
    recommendations: ['Сверить фактический расход', 'Зафиксировать восстановление', 'Закрыть инцидент'],
  },
  {
    id: 109,
    agentId: 'heat',
    minutesAgo: 150,
    updatedMinutesAgo: 132,
    title: 'Нестабильность температуры в ЦТП-14',
    description: 'Расхождение по датчикам в ЦТП-14, отклонение 5%.',
    level: 2,
    status: 'Resolved',
    requiresAttention: false,
    location: { address: 'ул. Белинского, 14', lat: 59.9368, lon: 30.3539 },
    source: { systemName: 'HeatWatch', sensorId: 'HW-152' },
    recommendations: ['Проверить калибровку датчиков', 'Сверить показания с архивом', 'Закрыть инцидент'],
  },
  {
    id: 110,
    agentId: 'heat',
    minutesAgo: 210,
    updatedMinutesAgo: 190,
    title: 'Колебания расхода теплоносителя',
    description: 'Рост расхода на 6% выше нормы.',
    level: 3,
    status: 'Closed',
    requiresAttention: false,
    location: { address: 'ул. Балтийская, 26', lat: 59.9067, lon: 30.2976 },
    source: { systemName: 'ThermoPulse', sensorId: 'TP-044' },
    recommendations: ['Проверить балансировку', 'Откорректировать режим', 'Зафиксировать в журнале'],
  },
  {
    id: 111,
    agentId: 'heat',
    minutesAgo: 240,
    updatedMinutesAgo: 220,
    title: 'Скачок температуры на участке теплосети',
    description: 'Температура подачи выросла на 8% за 10 минут.',
    level: 2,
    status: 'Resolved',
    requiresAttention: false,
    location: { address: 'ул. Типанова, 21', lat: 59.8636, lon: 30.3359 },
    source: { systemName: 'HeatWatch', sensorId: 'HS-204' },
    recommendations: ['Проверить узел смешения', 'Снизить подачу на 5%', 'Контроль через 15 минут'],
  },
  {
    id: 112,
    agentId: 'heat',
    minutesAgo: 285,
    updatedMinutesAgo: 270,
    title: 'Дисбаланс давления по подающему коллектору',
    description: 'Разница давления между секторами 12%.',
    level: 2,
    status: 'Closed',
    requiresAttention: false,
    location: { address: 'ул. Чайковского, 18', lat: 59.9421, lon: 30.3501 },
    source: { systemName: 'HydroScan', sensorId: 'HY-522' },
    recommendations: ['Согласовать перепуск', 'Оценить влияние на потребителей', 'Закрыть задачу'],
  },
  {
    id: 201,
    agentId: 'air',
    minutesAgo: 5,
    updatedMinutesAgo: 2,
    title: 'Превышение PM2.5 у школы №1',
    description: 'PM2.5 55–90 мкг/м³ в течение 2–3 часов, требуется реакция.',
    level: 1,
    status: 'New',
    requiresAttention: true,
    location: { address: 'Школа №1, ул. Профсоюзная, 10', lat: 59.8895, lon: 30.3278 },
    source: { systemName: 'AirSense', sensorId: 'AQ-901' },
    recommendations: ['Проверить транспортный поток', 'Запустить оповещение', 'Назначить повторный замер'],
  },
  {
    id: 202,
    agentId: 'air',
    minutesAgo: 18,
    updatedMinutesAgo: 10,
    title: 'Превышение NO2 у развязки',
    description: 'NO2 выше нормы на 14%, пик в час пик.',
    level: 2,
    status: 'InProgress',
    requiresAttention: true,
    location: { address: 'Развязка КАД, км 5', lat: 59.9022, lon: 30.3251 },
    source: { systemName: 'EcoTrack', sensorId: 'ET-210' },
    recommendations: ['Запросить данные от дорожных служб', 'Оценить концентрацию повторно', 'Подготовить уведомление'],
  },
  {
    id: 203,
    agentId: 'air',
    minutesAgo: 30,
    updatedMinutesAgo: 24,
    title: 'Рост PM10 в промзоне',
    description: 'PM10 вырос на 20%, запрошена информация от предприятий.',
    level: 2,
    status: 'InProgress',
    requiresAttention: true,
    location: { address: 'Промзона «Южная»', lat: 59.8521, lon: 30.2841 },
    source: { systemName: 'AirSense', sensorId: 'AQ-112' },
    recommendations: ['Запросить данные от предприятий', 'Снять дополнительные замеры', 'Подготовить отчет'],
  },
  {
    id: 204,
    agentId: 'air',
    minutesAgo: 45,
    updatedMinutesAgo: 38,
    title: 'Потеря пакетов данных от датчика AQ-17',
    description: 'Потеря 12% пакетов, требуется диагностика канала.',
    level: 3,
    status: 'New',
    requiresAttention: false,
    location: { address: 'ул. Бухарестская, 74', lat: 59.8664, lon: 30.3911 },
    source: { systemName: 'AirSense', sensorId: 'AQ-017' },
    recommendations: ['Проверить связь с датчиком', 'Переинициализировать канал', 'Сообщить в ИТ-службу'],
  },
  {
    id: 205,
    agentId: 'air',
    minutesAgo: 62,
    updatedMinutesAgo: 55,
    title: 'Снижение уровня кислорода',
    description: 'O₂ ниже нормы на 3%, жалобы от жителей.',
    level: 2,
    status: 'InProgress',
    requiresAttention: true,
    location: { address: 'ул. Белы Куна, 19', lat: 59.8679, lon: 30.3715 },
    source: { systemName: 'EcoTrack', sensorId: 'ET-355' },
    recommendations: ['Проверить вентиляцию', 'Связаться с площадкой', 'Контроль через 30 минут'],
  },
  {
    id: 206,
    agentId: 'air',
    minutesAgo: 80,
    updatedMinutesAgo: 72,
    title: 'Повышение CO в жилом квартале',
    description: 'CO выше среднего, предположительно из-за ТЭЦ.',
    level: 3,
    status: 'New',
    requiresAttention: false,
    location: { address: 'ул. Типанова, 21', lat: 59.8636, lon: 30.3359 },
    source: { systemName: 'EcoTrack', sensorId: 'ET-355' },
    recommendations: ['Проверить соседние котельные', 'Оповестить район', 'Мониторить 1 час'],
  },
  {
    id: 207,
    agentId: 'air',
    minutesAgo: 95,
    updatedMinutesAgo: 90,
    title: 'Рост VOC рядом с АЗС',
    description: 'Летучие органические соединения выше нормы на 9%.',
    level: 2,
    status: 'InProgress',
    requiresAttention: true,
    location: { address: 'АЗС «Север», пр-т Славы, 31', lat: 59.8531, lon: 30.4181 },
    source: { systemName: 'AirSense', sensorId: 'AQ-560' },
    recommendations: ['Запросить проверку АЗС', 'Снять контрольные замеры', 'Подготовить отчет'],
  },
  {
    id: 208,
    agentId: 'air',
    minutesAgo: 120,
    updatedMinutesAgo: 110,
    title: 'Стабилизация качества воздуха',
    description: 'Показатели вернулись к норме после ночного минимума.',
    level: 3,
    status: 'Resolved',
    requiresAttention: false,
    location: { address: 'ул. Дыбенко, 11', lat: 59.9077, lon: 30.4839 },
    source: { systemName: 'AirSense', sensorId: 'AQ-430' },
    recommendations: ['Зафиксировать улучшение', 'Закрыть уведомление', 'Поддерживать наблюдение'],
  },
  {
    id: 209,
    agentId: 'air',
    minutesAgo: 150,
    updatedMinutesAgo: 138,
    title: 'Пиковая нагрузка по пыли',
    description: 'Кратковременный всплеск пыли на стройплощадке.',
    level: 2,
    status: 'Closed',
    requiresAttention: false,
    location: { address: 'ул. Дыбенко, 23', lat: 59.907, lon: 30.489 },
    source: { systemName: 'EcoTrack', sensorId: 'ET-099' },
    recommendations: ['Оценить влияние стройки', 'Передать данные в мониторинг', 'Закрыть событие'],
  },
  {
    id: 210,
    agentId: 'air',
    minutesAgo: 180,
    updatedMinutesAgo: 168,
    title: 'Понижение влажности ниже нормы',
    description: 'Влажность воздуха снижена на 10% относительно нормы.',
    level: 3,
    status: 'Resolved',
    requiresAttention: false,
    location: { address: 'ул. Марата, 9', lat: 59.925, lon: 30.3528 },
    source: { systemName: 'AirSense', sensorId: 'AQ-210' },
    recommendations: ['Сообщить о нормализации', 'Сохранить в отчете', 'Закрыть инцидент'],
  },
  {
    id: 211,
    agentId: 'air',
    minutesAgo: 210,
    updatedMinutesAgo: 198,
    title: 'Подозрение на некорректную калибровку',
    description: 'Датчик AQ-33 дает расхождение 7%.',
    level: 3,
    status: 'Closed',
    requiresAttention: false,
    location: { address: 'ул. Школьная, 22', lat: 59.943, lon: 30.311 },
    source: { systemName: 'AirSense', sensorId: 'AQ-033' },
    recommendations: ['Проверить калибровку', 'Отправить сервисный запрос', 'Закрыть задачу'],
  },
  {
    id: 212,
    agentId: 'air',
    minutesAgo: 240,
    updatedMinutesAgo: 220,
    title: 'Запрос на дополнительные замеры в центре',
    description: 'Нужно уточнить фоновые значения в центре города.',
    level: 3,
    status: 'New',
    requiresAttention: false,
    location: { address: 'Невский пр., 48', lat: 59.9349, lon: 30.3351 },
    source: { systemName: 'EcoTrack', sensorId: 'ET-501' },
    recommendations: ['Запланировать выезд мобильной станции', 'Согласовать с департаментом', 'Обновить план мониторинга'],
  },
  {
    id: 301,
    agentId: 'noise',
    minutesAgo: 8,
    updatedMinutesAgo: 4,
    title: 'Ночной шум выше нормы (стройплощадка)',
    description: 'LAeq 68 dBA, 25 минут, повторяемость 4 раза.',
    level: 2,
    status: 'New',
    requiresAttention: true,
    location: { address: 'Стройплощадка, ул. Жуковского, 7', lat: 59.9398, lon: 30.3465 },
    source: { systemName: 'SoundMap', sensorId: 'SN-740' },
    recommendations: ['Связаться с дежурной службой', 'Проверить разрешение на работы', 'Зафиксировать нарушение'],
  },
  {
    id: 302,
    agentId: 'noise',
    minutesAgo: 20,
    updatedMinutesAgo: 12,
    title: 'Регулярные превышения у магистрали в час пик',
    description: 'Пики 64–66 dBA, повторяется ежедневно.',
    level: 2,
    status: 'InProgress',
    requiresAttention: true,
    location: { address: 'Магистраль М-5, км 2', lat: 59.9889, lon: 30.2193 },
    source: { systemName: 'NoiseGuard', sensorId: 'NG-500' },
    recommendations: ['Проверить шумозащитные экраны', 'Согласовать замеры с ГИБДД', 'Подготовить рекомендации'],
  },
  {
    id: 303,
    agentId: 'noise',
    minutesAgo: 34,
    updatedMinutesAgo: 26,
    title: 'Серия кратковременных пиков (работы техники)',
    description: 'Пики до 72 dBA, длительность 5–7 минут.',
    level: 2,
    status: 'InProgress',
    requiresAttention: true,
    location: { address: 'ул. Савушкина, 45', lat: 59.9889, lon: 30.2193 },
    source: { systemName: 'SoundMap', sensorId: 'SN-155' },
    recommendations: ['Уточнить график работ', 'Проверить соответствие нормам', 'Повторный замер'],
  },
  {
    id: 304,
    agentId: 'noise',
    minutesAgo: 48,
    updatedMinutesAgo: 42,
    title: 'Шумомер N-04: нестабильная связь',
    description: 'Потери сигнала до 15%, требуется диагностика.',
    level: 3,
    status: 'New',
    requiresAttention: false,
    location: { address: 'ул. Мира, 3', lat: 59.958, lon: 30.3174 },
    source: { systemName: 'NoiseGuard', sensorId: 'N-04' },
    recommendations: ['Перезапустить модем', 'Проверить питание', 'Сообщить в поддержку'],
  },
  {
    id: 305,
    agentId: 'noise',
    minutesAgo: 62,
    updatedMinutesAgo: 58,
    title: 'Рост шума у строительной площадки',
    description: 'Дневные нормативы превышены на 8%.',
    level: 2,
    status: 'InProgress',
    requiresAttention: true,
    location: { address: 'ул. Савушкина, 61', lat: 59.9861, lon: 30.2165 },
    source: { systemName: 'NoiseGuard', sensorId: 'NG-321' },
    recommendations: ['Запросить график работ', 'Оценить шумоизоляцию', 'Оповестить службу'],
  },
  {
    id: 306,
    agentId: 'noise',
    minutesAgo: 80,
    updatedMinutesAgo: 72,
    title: 'Пиковый уровень шума у парка',
    description: 'Рост показателей на 15% выше среднего.',
    level: 2,
    status: 'New',
    requiresAttention: true,
    location: { address: 'Лиговский пр., 210', lat: 59.9052, lon: 30.3459 },
    source: { systemName: 'NoiseGuard', sensorId: 'NG-887' },
    recommendations: ['Проверить источник громкого звука', 'Оповестить патруль', 'Повторный замер'],
  },
  {
    id: 307,
    agentId: 'noise',
    minutesAgo: 98,
    updatedMinutesAgo: 90,
    title: 'Нестабильный шум в транспортном узле',
    description: 'Пиковые значения у транспортной развязки.',
    level: 3,
    status: 'InProgress',
    requiresAttention: false,
    location: { address: 'пл. Александра Невского, 2', lat: 59.9256, lon: 30.3841 },
    source: { systemName: 'SoundMap', sensorId: 'SN-219' },
    recommendations: ['Проверить трафик', 'Сверить расписание', 'Продолжить наблюдение'],
  },
  {
    id: 308,
    agentId: 'noise',
    minutesAgo: 120,
    updatedMinutesAgo: 110,
    title: 'Шумовой фон вернулся к норме',
    description: 'Показатели стабилизировались в районе.',
    level: 3,
    status: 'Resolved',
    requiresAttention: false,
    location: { address: 'ул. Балтийская, 26', lat: 59.9067, lon: 30.2976 },
    source: { systemName: 'SoundMap', sensorId: 'SN-219' },
    recommendations: ['Закрыть инцидент', 'Сохранить отчет', 'Оценить повтор'],
  },
  {
    id: 309,
    agentId: 'noise',
    minutesAgo: 150,
    updatedMinutesAgo: 138,
    title: 'Снижение шума после ограничений трафика',
    description: 'Средний уровень снизился на 6 dBA.',
    level: 3,
    status: 'Resolved',
    requiresAttention: false,
    location: { address: 'пр-т Славы, 31', lat: 59.8531, lon: 30.4181 },
    source: { systemName: 'SoundMap', sensorId: 'SN-144' },
    recommendations: ['Зафиксировать результат', 'Обновить отчеты', 'Закрыть задачу'],
  },
  {
    id: 310,
    agentId: 'noise',
    minutesAgo: 180,
    updatedMinutesAgo: 170,
    title: 'Шум на рекреационной зоне',
    description: 'Рост вечернего шума до 62 dBA.',
    level: 2,
    status: 'Closed',
    requiresAttention: false,
    location: { address: 'Парк «Северный»', lat: 59.9456, lon: 30.2871 },
    source: { systemName: 'NoiseGuard', sensorId: 'NG-210' },
    recommendations: ['Проверить источник музыки', 'Согласовать ограничения', 'Закрыть событие'],
  },
  {
    id: 311,
    agentId: 'noise',
    minutesAgo: 210,
    updatedMinutesAgo: 198,
    title: 'Краткий всплеск шума на ж/д узле',
    description: 'Пики 70 dBA, 12 минут.',
    level: 2,
    status: 'Closed',
    requiresAttention: false,
    location: { address: 'Ж/д узел, ул. Заставская, 15', lat: 59.8942, lon: 30.3099 },
    source: { systemName: 'SoundMap', sensorId: 'SN-508' },
    recommendations: ['Согласовать меры с РЖД', 'Обновить прогнозы', 'Закрыть инцидент'],
  },
  {
    id: 312,
    agentId: 'noise',
    minutesAgo: 240,
    updatedMinutesAgo: 225,
    title: 'Подозрение на неверную калибровку шумомера',
    description: 'Отклонение 5 dBA от контрольного датчика.',
    level: 3,
    status: 'New',
    requiresAttention: false,
    location: { address: 'ул. Школьная, 22', lat: 59.943, lon: 30.311 },
    source: { systemName: 'NoiseGuard', sensorId: 'NG-099' },
    recommendations: ['Проверить калибровку', 'Назначить сервис', 'Отметить в журнале'],
  },
];

const DEMO_ACTION_LOG_DEFINITIONS: DemoActionLogDefinition[] = [
  {
    id: 'heat-1',
    agentId: 'heat',
    actionType: 'notify',
    minutesAgo: 4,
    summary: 'Оповещена аварийная смена по прорыву на М-3.',
    relatedEventId: 101,
    resultStatus: 'success',
  },
  {
    id: 'heat-2',
    agentId: 'heat',
    actionType: 'assign_task',
    minutesAgo: 3,
    summary: 'Назначено поручение на изоляцию участка и переключение контура.',
    relatedEventId: 101,
    resultStatus: 'pending',
  },
  {
    id: 'heat-3',
    agentId: 'heat',
    actionType: 'request_info',
    minutesAgo: 12,
    summary: 'Запрошены параметры ЦТП-12 за последние 2 часа.',
    relatedEventId: 102,
    resultStatus: 'success',
  },
  {
    id: 'heat-4',
    agentId: 'heat',
    actionType: 'comment',
    minutesAgo: 11,
    summary: 'Инженер смены подтвердил перегрев на подаче.',
    relatedEventId: 102,
    resultStatus: 'success',
  },
  {
    id: 'heat-5',
    agentId: 'heat',
    actionType: 'assign_task',
    minutesAgo: 26,
    summary: 'Поручение на диагностику узла У-7 и оценку кавитации.',
    relatedEventId: 103,
    resultStatus: 'success',
  },
  {
    id: 'heat-6',
    agentId: 'heat',
    actionType: 'escalate',
    minutesAgo: 54,
    summary: 'Эскалация по утечке теплоносителя на квартальной магистрали.',
    relatedEventId: 105,
    resultStatus: 'pending',
  },
  {
    id: 'heat-7',
    agentId: 'heat',
    actionType: 'create_document',
    minutesAgo: 53,
    summary: 'Сформирован отчет о риске утечки и сценарии отключения.',
    relatedEventId: 105,
    resultStatus: 'success',
  },
  {
    id: 'heat-8',
    agentId: 'heat',
    actionType: 'notify',
    minutesAgo: 72,
    summary: 'Оповещение механиков по вибрации НС-4.',
    relatedEventId: 106,
    resultStatus: 'success',
  },
  {
    id: 'heat-9',
    agentId: 'heat',
    actionType: 'auto_close',
    minutesAgo: 116,
    summary: 'Автозакрытие после стабилизации расхода на ветке В-2.',
    relatedEventId: 108,
    resultStatus: 'success',
  },
  {
    id: 'heat-10',
    agentId: 'heat',
    actionType: 'comment',
    minutesAgo: 130,
    summary: 'Комментарий диспетчера: давление стабилизировано.',
    relatedEventId: 109,
    resultStatus: 'success',
  },
  {
    id: 'air-1',
    agentId: 'air',
    actionType: 'notify',
    minutesAgo: 4,
    summary: 'Отправлено оповещение по превышению PM2.5 у школы.',
    relatedEventId: 201,
    resultStatus: 'success',
  },
  {
    id: 'air-2',
    agentId: 'air',
    actionType: 'assign_task',
    minutesAgo: 3,
    summary: 'Назначено поручение на контрольный замер у школы №1.',
    relatedEventId: 201,
    resultStatus: 'pending',
  },
  {
    id: 'air-3',
    agentId: 'air',
    actionType: 'request_info',
    minutesAgo: 16,
    summary: 'Запрошены данные у дорожных служб по развязке.',
    relatedEventId: 202,
    resultStatus: 'success',
  },
  {
    id: 'air-4',
    agentId: 'air',
    actionType: 'comment',
    minutesAgo: 28,
    summary: 'Подтвержден рост PM10 в промзоне, данные от предприятий ожидаются.',
    relatedEventId: 203,
    resultStatus: 'pending',
  },
  {
    id: 'air-5',
    agentId: 'air',
    actionType: 'assign_task',
    minutesAgo: 29,
    summary: 'Поручение на выезд мобильной станции в промзону.',
    relatedEventId: 203,
    resultStatus: 'success',
  },
  {
    id: 'air-6',
    agentId: 'air',
    actionType: 'escalate',
    minutesAgo: 60,
    summary: 'Эскалация по снижению уровня кислорода.',
    relatedEventId: 205,
    resultStatus: 'pending',
  },
  {
    id: 'air-7',
    agentId: 'air',
    actionType: 'create_document',
    minutesAgo: 58,
    summary: 'Сформирован документ по инциденту с O₂.',
    relatedEventId: 205,
    resultStatus: 'success',
  },
  {
    id: 'air-8',
    agentId: 'air',
    actionType: 'notify',
    minutesAgo: 78,
    summary: 'Оповещение о росте CO в жилом квартале.',
    relatedEventId: 206,
    resultStatus: 'success',
  },
  {
    id: 'air-9',
    agentId: 'air',
    actionType: 'comment',
    minutesAgo: 117,
    summary: 'Комментарий аналитика: ночь прошла без превышений.',
    relatedEventId: 208,
    resultStatus: 'success',
  },
  {
    id: 'air-10',
    agentId: 'air',
    actionType: 'auto_close',
    minutesAgo: 146,
    summary: 'Автозакрытие по пылевой нагрузке после повторных замеров.',
    relatedEventId: 209,
    resultStatus: 'success',
  },
  {
    id: 'noise-1',
    agentId: 'noise',
    actionType: 'notify',
    minutesAgo: 7,
    summary: 'Оповещение службы контроля по ночному шуму.',
    relatedEventId: 301,
    resultStatus: 'success',
  },
  {
    id: 'noise-2',
    agentId: 'noise',
    actionType: 'assign_task',
    minutesAgo: 6,
    summary: 'Назначен выезд инспектора на стройплощадку.',
    relatedEventId: 301,
    resultStatus: 'pending',
  },
  {
    id: 'noise-3',
    agentId: 'noise',
    actionType: 'request_info',
    minutesAgo: 18,
    summary: 'Запрос графика работ по магистрали М-5.',
    relatedEventId: 302,
    resultStatus: 'success',
  },
  {
    id: 'noise-4',
    agentId: 'noise',
    actionType: 'comment',
    minutesAgo: 32,
    summary: 'Комментарий: пики совпадают с проходом спецтехники.',
    relatedEventId: 303,
    resultStatus: 'success',
  },
  {
    id: 'noise-5',
    agentId: 'noise',
    actionType: 'request_info',
    minutesAgo: 46,
    summary: 'Запрос диагностики шумомера N-04.',
    relatedEventId: 304,
    resultStatus: 'pending',
  },
  {
    id: 'noise-6',
    agentId: 'noise',
    actionType: 'assign_task',
    minutesAgo: 60,
    summary: 'Назначен контрольный замер у строительной площадки.',
    relatedEventId: 305,
    resultStatus: 'success',
  },
  {
    id: 'noise-7',
    agentId: 'noise',
    actionType: 'escalate',
    minutesAgo: 58,
    summary: 'Эскалация по повторяющимся превышениям.',
    relatedEventId: 306,
    resultStatus: 'pending',
  },
  {
    id: 'noise-8',
    agentId: 'noise',
    actionType: 'create_document',
    minutesAgo: 56,
    summary: 'Сформирован акт о повторяемости ночного шума.',
    relatedEventId: 306,
    resultStatus: 'success',
  },
  {
    id: 'noise-9',
    agentId: 'noise',
    actionType: 'comment',
    minutesAgo: 116,
    summary: 'Комментарий: фон стабилизирован после ограничения трафика.',
    relatedEventId: 308,
    resultStatus: 'success',
  },
  {
    id: 'noise-10',
    agentId: 'noise',
    actionType: 'auto_close',
    minutesAgo: 145,
    summary: 'Автозакрытие инцидента по шуму на рекреационной зоне.',
    relatedEventId: 310,
    resultStatus: 'success',
  },
];

const DEMO_TASK_DECISION_DEFINITIONS: DemoTaskDecisionDefinition[] = [
  {
    id: 'heat-task-1',
    agentId: 'heat',
    title: 'Локализовать прорыв на магистрали М-3',
    createdMinutesAgo: 5,
    dueInMinutes: 120,
    status: 'InProgress',
    assignee: 'Бригада №12',
    priority: 'Высокий',
    linkedEventIds: [101],
  },
  {
    id: 'heat-task-2',
    agentId: 'heat',
    title: 'Отчет по отклонению температуры на ЦТП-12',
    createdMinutesAgo: 20,
    dueInMinutes: 180,
    status: 'Created',
    assignee: 'Инженер смены',
    priority: 'Средний',
    linkedEventIds: [102],
  },
  {
    id: 'heat-task-3',
    agentId: 'heat',
    title: 'Диагностика узла У-7 и проверка кавитации',
    createdMinutesAgo: 30,
    dueInMinutes: 90,
    status: 'InProgress',
    assignee: 'Сервисная группа',
    priority: 'Высокий',
    linkedEventIds: [103],
  },
  {
    id: 'heat-task-4',
    agentId: 'heat',
    title: 'План работ по утечке теплоносителя',
    createdMinutesAgo: 60,
    dueInMinutes: -30,
    status: 'Overdue',
    assignee: 'Аварийная служба',
    priority: 'Высокий',
    linkedEventIds: [105],
  },
  {
    id: 'heat-task-5',
    agentId: 'heat',
    title: 'Акт восстановления расхода ветки В-2',
    createdMinutesAgo: 130,
    dueInMinutes: -20,
    status: 'Done',
    assignee: 'Диспетчер',
    priority: 'Низкий',
    linkedEventIds: [108],
  },
  {
    id: 'heat-task-6',
    agentId: 'heat',
    title: 'Калибровка датчика P-204',
    createdMinutesAgo: 50,
    dueInMinutes: 240,
    status: 'Created',
    assignee: 'Сервис датчиков',
    priority: 'Средний',
    linkedEventIds: [104],
  },
  {
    id: 'air-task-1',
    agentId: 'air',
    title: 'Контрольный замер PM2.5 у школы №1',
    createdMinutesAgo: 4,
    dueInMinutes: 90,
    status: 'InProgress',
    assignee: 'Лаборатория мониторинга',
    priority: 'Высокий',
    linkedEventIds: [201],
  },
  {
    id: 'air-task-2',
    agentId: 'air',
    title: 'Запрос данных по выбросам у развязки',
    createdMinutesAgo: 18,
    dueInMinutes: 120,
    status: 'Created',
    assignee: 'Аналитик воздуха',
    priority: 'Средний',
    linkedEventIds: [202],
  },
  {
    id: 'air-task-3',
    agentId: 'air',
    title: 'Отчет по росту PM10 в промзоне',
    createdMinutesAgo: 28,
    dueInMinutes: 180,
    status: 'InProgress',
    assignee: 'Экологическая служба',
    priority: 'Высокий',
    linkedEventIds: [203],
  },
  {
    id: 'air-task-4',
    agentId: 'air',
    title: 'План мероприятий по снижению O₂',
    createdMinutesAgo: 65,
    dueInMinutes: -15,
    status: 'Overdue',
    assignee: 'Штаб реагирования',
    priority: 'Высокий',
    linkedEventIds: [205],
  },
  {
    id: 'air-task-5',
    agentId: 'air',
    title: 'Сводка по стабилизации качества воздуха',
    createdMinutesAgo: 110,
    dueInMinutes: -5,
    status: 'Done',
    assignee: 'Дежурный аналитик',
    priority: 'Низкий',
    linkedEventIds: [208],
  },
  {
    id: 'air-task-6',
    agentId: 'air',
    title: 'Диагностика канала датчика AQ-17',
    createdMinutesAgo: 44,
    dueInMinutes: 200,
    status: 'Created',
    assignee: 'ИТ-поддержка',
    priority: 'Средний',
    linkedEventIds: [204],
  },
  {
    id: 'noise-task-1',
    agentId: 'noise',
    title: 'Выезд инспектора на стройплощадку (ночной шум)',
    createdMinutesAgo: 6,
    dueInMinutes: 60,
    status: 'InProgress',
    assignee: 'Группа контроля шума',
    priority: 'Высокий',
    linkedEventIds: [301],
  },
  {
    id: 'noise-task-2',
    agentId: 'noise',
    title: 'Отчет по повторяемости шумов на магистрали М-5',
    createdMinutesAgo: 20,
    dueInMinutes: 180,
    status: 'Created',
    assignee: 'Аналитик шума',
    priority: 'Средний',
    linkedEventIds: [302],
  },
  {
    id: 'noise-task-3',
    agentId: 'noise',
    title: 'Согласование ограничений на работу техники',
    createdMinutesAgo: 32,
    dueInMinutes: 240,
    status: 'InProgress',
    assignee: 'Муниципальный контроль',
    priority: 'Высокий',
    linkedEventIds: [303],
  },
  {
    id: 'noise-task-4',
    agentId: 'noise',
    title: 'Диагностика связи шумомера N-04',
    createdMinutesAgo: 46,
    dueInMinutes: 90,
    status: 'Created',
    assignee: 'ИТ-служба',
    priority: 'Средний',
    linkedEventIds: [304],
  },
  {
    id: 'noise-task-5',
    agentId: 'noise',
    title: 'Проверка шумозащитных экранов у парка',
    createdMinutesAgo: 82,
    dueInMinutes: -10,
    status: 'Overdue',
    assignee: 'Эксплуатация',
    priority: 'Высокий',
    linkedEventIds: [306],
  },
  {
    id: 'noise-task-6',
    agentId: 'noise',
    title: 'Сводный отчет о снижении шума после ограничений',
    createdMinutesAgo: 120,
    dueInMinutes: -5,
    status: 'Done',
    assignee: 'Дежурный аналитик',
    priority: 'Низкий',
    linkedEventIds: [308, 309],
  },
];

const toIso = (timestamp: number) => new Date(timestamp).toISOString();

const buildTimeseriesPoints = (
  now: number,
  series: Record<string, number[]>,
): DemoTimeseriesPoint[] => {
  return Array.from({ length: 24 }, (_, index) => {
    const hoursAgo = 23 - index;
    const timestamp = toIso(now - hoursAgo * 60 * 60 * 1000);
    const values = Object.fromEntries(
      Object.entries(series).map(([metric, values]) => [metric, values[index]]),
    );
    return { timestamp, values };
  });
};

const HEAT_PRESSURE = [
  7.9, 7.8, 7.8, 7.7, 7.8, 7.7, 7.8, 7.8, 7.7, 7.7, 7.8, 7.7, 7.6, 7.6, 7.5, 7.5, 7.6, 7.7,
  7.8, 7.8, 7.7, 7.6, 4.1, 7.7,
];
const HEAT_TEMPERATURE = [
  92, 92, 91, 91, 92, 93, 93, 94, 94, 94, 95, 95, 95, 96, 96, 95, 95, 94, 94, 93, 92, 92, 86,
  93,
];

const AIR_PM25 = [
  14, 13, 12, 12, 11, 11, 12, 13, 15, 16, 18, 20, 22, 25, 28, 30, 34, 36, 38, 42, 45, 48, 52, 55,
];

const NOISE_DBA = [
  48, 47, 46, 45, 44, 45, 52, 58, 54, 50, 49, 48, 47, 46, 50, 57, 60, 55, 51, 49, 48, 46, 45, 44,
];

export const createDemoAgents = (options?: { pausedAgents?: AgentFlags }): DemoAgent[] => {
  const pausedAgents = options?.pausedAgents ?? {};
  return AGENTS.map((agent: AgentDefinition) => ({
    id: agent.id,
    name: agent.title,
    responsibilityZone: agent.responsibility,
    isPaused: pausedAgents[agent.id] ?? agent.paused ?? false,
  }));
};

export const createDemoEvents = (
  now: number = Date.now(),
  options?: { staleAgents?: AgentFlags; extraEvents?: DemoEventOverride[] },
): EventResponse[] => {
  const staleAgents = options?.staleAgents ?? {};
  const extraEvents = options?.extraEvents ?? [];
  const staleMinutes = STALE_DATA_THRESHOLD_MINUTES + 45;

  const baseEvents = DEMO_EVENT_DEFINITIONS.map((definition) => {
    const createdAt = toIso(now - definition.minutesAgo * 60 * 1000);
    const updatedAt = toIso(now - definition.updatedMinutesAgo * 60 * 1000);
    const domainLabel = DOMAIN_LABELS[definition.agentId];
    const forcedUpdatedAt = staleAgents[definition.agentId]
      ? toIso(now - staleMinutes * 60 * 1000)
      : updatedAt;

    return {
      id: definition.id,
      created_at: createdAt,
      msg: {
        domain: domainLabel,
        title: definition.title,
        description: definition.description,
        level: definition.level,
        status: definition.status,
        requiresAttention: definition.requiresAttention,
        updated_at: forcedUpdatedAt,
        system: domainLabel,
        subsystem: definition.agentId,
        category: domainLabel,
        type: definition.status,
        location: definition.location,
        source: definition.source,
        recommendations: definition.recommendations,
      },
    };
  });

  const overrideEvents = extraEvents.map((definition) => {
    return createEventResponseFromOverride(definition, now, staleAgents);
  });

  return [...baseEvents, ...overrideEvents];
};

export const createEventResponseFromOverride = (
  definition: DemoEventOverride,
  now: number = Date.now(),
  staleAgents: AgentFlags = {},
): EventResponse => {
  const staleMinutes = STALE_DATA_THRESHOLD_MINUTES + 45;
  const createdAt =
    definition.createdAt ??
    toIso(now - (definition.minutesAgo ?? 0) * 60 * 1000);
  const updatedAt =
    definition.updatedAt ??
    toIso(now - (definition.updatedMinutesAgo ?? definition.minutesAgo ?? 0) * 60 * 1000);
  const domainLabel = DOMAIN_LABELS[definition.agentId];
  const forcedUpdatedAt = staleAgents[definition.agentId]
    ? toIso(now - staleMinutes * 60 * 1000)
    : updatedAt;

  return {
    id: definition.id,
    created_at: createdAt,
    msg: {
      domain: domainLabel,
      title: definition.title,
      description: definition.description,
      level: definition.level,
      status: definition.status,
      requiresAttention: definition.requiresAttention,
      updated_at: forcedUpdatedAt,
      system: domainLabel,
      subsystem: definition.agentId,
      category: domainLabel,
      type: definition.status,
      location: definition.location,
      source: definition.source,
      recommendations: definition.recommendations,
    },
  };
};

export const createDemoActionLog = (now: number = Date.now()): DemoActionLogEntry[] => {
  return DEMO_ACTION_LOG_DEFINITIONS.map((definition) => ({
    id: definition.id,
    agentId: definition.agentId,
    actionType: definition.actionType,
    timestamp: toIso(now - definition.minutesAgo * 60 * 1000),
    summary: definition.summary,
    relatedEventId: definition.relatedEventId,
    resultStatus: definition.resultStatus,
  }));
};

export const createDemoTasksDecisions = (now: number = Date.now()): DemoTaskDecision[] => {
  return DEMO_TASK_DECISION_DEFINITIONS.map((definition) => ({
    id: definition.id,
    agentId: definition.agentId,
    title: definition.title,
    createdAt: toIso(now - definition.createdMinutesAgo * 60 * 1000),
    dueAt: toIso(now + definition.dueInMinutes * 60 * 1000),
    status: definition.status,
    assignee: definition.assignee,
    priority: definition.priority,
    linkedEventIds: definition.linkedEventIds,
  }));
};

export const createDemoTimeseries = (now: number = Date.now()): Record<AgentId, DemoTimeseriesPoint[]> => {
  return {
    heat: buildTimeseriesPoints(now, {
      'Давление, bar': HEAT_PRESSURE,
      'Температура, °C': HEAT_TEMPERATURE,
    }),
    air: buildTimeseriesPoints(now, {
      'PM2.5, мкг/м³': AIR_PM25,
    }),
    noise: buildTimeseriesPoints(now, {
      'Уровень шума, dBA': NOISE_DBA,
    }),
  };
};

export const createCriticalHeatEvent = (id: number, timestamp: number): DemoEventOverride => ({
  id,
  agentId: 'heat',
  title: 'Критическое падение давления на резервном контуре',
  description: 'Дополнительный критический инцидент: падение давления на резерве, требуется немедленная проверка.',
  level: 1,
  status: 'New',
  requiresAttention: true,
  location: { address: 'Резервный контур Р-2, ул. Ломаная, 6', lat: 59.9122, lon: 30.3561 },
  source: { systemName: 'HeatWatch', sensorId: 'HW-990' },
  recommendations: ['Поднять резервный насос', 'Проверить герметичность', 'Оповестить начальника смены'],
  createdAt: toIso(timestamp),
  updatedAt: toIso(timestamp),
});
