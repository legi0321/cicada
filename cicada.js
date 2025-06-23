require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'https://campaign.cicada.finance/api';
const CAMPAIGN_ID = 440;
const AUTH_TOKEN = process.env.AUTH_TOKEN;
const COOKIES = process.env.COOKIES;

const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.4; rv:124.0) Gecko/20100101 Firefox/124.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/137.0.0.0',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
];

const getRandomUserAgent = () => {
  return userAgents[Math.floor(Math.random() * userAgents.length)];
};

const colors = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  white: "\x1b[37m",
  bold: "\x1b[1m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
};

const logger = {
  info: (msg) => console.log(`${colors.green}[✓] ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}[⚠] ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}[✗] ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}[✅] ${msg}${colors.reset}`),
  loading: (msg) => console.log(`${colors.cyan}[⟳] ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.white}[➤] ${msg}${colors.reset}`),
  banner: () => {
    console.log(`${colors.cyan}${colors.bold}`);
    console.log(`---------------------------------------------`);
    console.log(`  Cicada Auto Bot - Airdrop Insiders  `);
    console.log(`---------------------------------------------${colors.reset}`);
    console.log();
  },
};

const getHeaders = () => ({
  'accept': '*/*',
  'accept-language': 'en-US,en;q=0.6',
  'authorization': AUTH_TOKEN,
  'content-type': 'application/json',
  'priority': 'u=1, i',
  'sec-ch-ua': '"Brave";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
  'sec-gpc': '1',
  'cookie': COOKIES,
  'Referer': 'https://campaign.cicada.finance/campaigns/6d70de3a-60ea-4896-b713-276de1bc02c7?code=g1nLayZV',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'user-agent': getRandomUserAgent(),
});

async function fetchCompletedPoints() {
  logger.loading('Fetching completed points...');
  try {
    const response = await axios.get(`${BASE_URL}/points?campaignId=${CAMPAIGN_ID}`, { headers: getHeaders() });
    logger.success(`Fetched ${response.data.length} completed points.`);
    return new Set(response.data.map(item => item.task_id));
  } catch (error) {
    logger.error(`Error fetching completed points: ${error.response?.data?.message || error.message}`);
    return new Set();
  }
}

async function fetchCompletedGems() {
  logger.loading('Fetching completed gems...');
  try {
    const response = await axios.get(`${BASE_URL}/gems?campaignId=${CAMPAIGN_ID}`, { headers: getHeaders() });
    logger.success(`Fetched ${response.data.length} completed gems.`);
    return new Set(response.data.map(item => item.task_id));
  } catch (error) {
    logger.error(`Error fetching completed gems: ${error.response?.data?.message || error.message}`);
    return new Set();
  }
}

async function fetchTasks() {
  logger.loading('Fetching all tasks...');
  try {
    const response = await axios.get(`${BASE_URL}/campaigns/${CAMPAIGN_ID}/tasks`, { headers: getHeaders() });
    logger.success(`Fetched ${response.data.length} tasks.`);
    return response.data;
  } catch (error) {
    logger.error(`Error fetching tasks: ${error.response?.data?.message || error.message}`);
    return [];
  }
}

async function completeTask(taskId, taskTitle) {
  logger.step(`Attempting to complete task: ${taskTitle} (ID: ${taskId})`);
  try {
    const pointsResponse = await axios.post(`${BASE_URL}/points/add`, { taskId }, { headers: getHeaders() });
    logger.info(`Points added for task ${taskTitle} (ID: ${taskId}): ${pointsResponse.data.points} points`);

    const gemsResponse = await axios.post(`${BASE_URL}/gems/credit`, {
      transactionType: 'TASK',
      options: { taskId },
    }, { headers: getHeaders() });
    logger.info(`Gems credited for task ${taskTitle} (ID: ${taskId}): ${gemsResponse.data.credit} gems`);

    return true;
  } catch (error) {
    logger.error(`Error completing task ${taskTitle} (ID: ${taskId}): ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function processTasks() {
  logger.banner();

  if (!AUTH_TOKEN || !COOKIES) {
    logger.error('AUTH_TOKEN or COOKIES not found in .env file. Please set them and try again.');
    return;
  }

  const completedPoints = await fetchCompletedPoints();
  const completedGems = await fetchCompletedGems();
  logger.info(`Found ${completedPoints.size} tasks with points and ${completedGems.size} tasks with gems.`);

  const tasks = await fetchTasks();

  if (!tasks.length) {
    logger.warn('No tasks found.');
    return;
  }

  for (const task of tasks) {
    
    if (!completedPoints.has(task.id) || !completedGems.has(task.id)) {
      const success = await completeTask(task.id, task.title);

      if (success) {
        logger.success(`Task ${task.title} completed successfully.`);
      } else {
        logger.error(`Failed to complete task ${task.title}.`);
      }
    } else {
      logger.info(`Task ${task.title} (ID: ${task.id}) already completed. Skipping.`);
    }

    if (task.subtasks && task.subtasks.length > 0) {
      logger.info(`Found ${task.subtasks.length} subtasks for ${task.title}.`);
      for (const subtask of task.subtasks) {
        if (!completedPoints.has(subtask.id) || !completedGems.has(subtask.id)) {
          const success = await completeTask(subtask.id, subtask.title);

          if (success) {
            logger.success(`Subtask ${subtask.title} completed successfully.`);
          } else {
            logger.error(`Failed to complete subtask ${subtask.title}.`);
          }
        } else {
          logger.info(`Subtask ${subtask.title} (ID: ${subtask.id}) already completed. Skipping.`);
        }
      }
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  logger.success('All tasks and subtasks processed.');
}

processTasks().catch(error => logger.error(`Bot error: ${error.message}`));