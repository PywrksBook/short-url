const shortenForm = document.querySelector('#shorten-form');
const originalUrlInput = document.querySelector('#original-url');
const shortenButton = document.querySelector('#shorten-button');
const formMessage = document.querySelector('#form-message');
const resultCard = document.querySelector('#result-card');
const resultLink = document.querySelector('#result-link');
const resultQr = document.querySelector('#result-qr');
const downloadQr = document.querySelector('#download-qr');
const copyButton = document.querySelector('#copy-button');
const copyMessage = document.querySelector('#copy-message');
const historyBody = document.querySelector('#history-body');
const historyMessage = document.querySelector('#history-message');
const refreshHistoryButton = document.querySelector('#refresh-history');
const historyPagination = document.querySelector('#history-pagination');
const previousPageButton = document.querySelector('#previous-page');
const nextPageButton = document.querySelector('#next-page');
const pageIndicator = document.querySelector('#page-indicator');
let currentPage = 1;
let totalPages = 0;

function formatThaiDate(value) {
  if (!value) {
    return 'ยังไม่มีการคลิก';
  }

  return new Date(value).toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function createHistoryCell(text, className) {
  const cell = document.createElement('td');
  if (className) {
    cell.className = className;
  }
  cell.textContent = text;
  return cell;
}

function addHistoryRow(link) {
  const row = document.createElement('tr');
  const shortCell = document.createElement('td');
  const shortAnchor = document.createElement('a');
  const destinationCell = document.createElement('td');
  const destinationAnchor = document.createElement('a');

  shortAnchor.className = 'history-short-link';
  shortAnchor.href = new URL(link.shortCode, `${window.location.origin}/`).href;
  shortAnchor.target = '_blank';
  shortAnchor.rel = 'noopener noreferrer';
  shortAnchor.textContent = shortAnchor.href;
  shortCell.append(shortAnchor);

  destinationAnchor.className = 'history-destination';
  destinationAnchor.href = link.originalUrl;
  destinationAnchor.target = '_blank';
  destinationAnchor.rel = 'noopener noreferrer';
  destinationAnchor.title = link.originalUrl;
  destinationAnchor.textContent = link.originalUrl;
  destinationCell.append(destinationAnchor);

  row.append(
    shortCell,
    destinationCell,
    createHistoryCell(String(link.clickCount), 'click-count'),
    createHistoryCell(formatThaiDate(link.createdAt)),
    createHistoryCell(formatThaiDate(link.lastClickedAt)),
  );
  historyBody.append(row);
}

async function loadHistory(page = currentPage) {
  historyBody.replaceChildren();
  historyMessage.textContent = 'กำลังโหลดประวัติลิงก์...';
  refreshHistoryButton.disabled = true;
  previousPageButton.disabled = true;
  nextPageButton.disabled = true;

  try {
    const response = await fetch(`/api/urls?page=${page}`);
    if (!response.ok) {
      throw new Error('โหลดประวัติลิงก์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    }

    const history = await response.json();
    if (!Array.isArray(history.items)) {
      throw new Error('รูปแบบข้อมูลประวัติไม่ถูกต้อง');
    }

    currentPage = history.page;
    totalPages = history.totalPages;
    historyPagination.hidden = totalPages <= 1;
    pageIndicator.textContent = `หน้า ${currentPage} จาก ${totalPages}`;
    previousPageButton.disabled = currentPage <= 1;
    nextPageButton.disabled = currentPage >= totalPages;

    if (history.items.length === 0) {
      historyMessage.textContent = '';
      const emptyRow = document.createElement('tr');
      const emptyCell = document.createElement('td');
      emptyCell.colSpan = 5;
      emptyCell.className = 'history-empty';
      emptyCell.textContent = 'ยังไม่มีลิงก์ ลองสร้างลิงก์แรกของคุณได้เลย';
      emptyRow.append(emptyCell);
      historyBody.append(emptyRow);
      return;
    }

    for (const link of history.items) {
      addHistoryRow(link);
    }
    historyMessage.textContent = '';
  } catch (error) {
    historyMessage.textContent = error.message;
  } finally {
    refreshHistoryButton.disabled = false;
  }
}

shortenForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  formMessage.textContent = '';
  copyMessage.textContent = '';
  shortenButton.disabled = true;
  shortenButton.querySelector('.button-label').textContent = 'กำลังสร้าง...';

  try {
    const response = await fetch('/api/urls', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ originalUrl: originalUrlInput.value }),
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'สร้างลิงก์ไม่สำเร็จ กรุณาลองใหม่');
    }

    resultLink.href = result.shortUrl;
    resultLink.textContent = result.shortUrl;
    resultQr.src = `/api/urls/${encodeURIComponent(result.shortCode)}/qr`;
    resultQr.alt = `QR Code สำหรับลิงก์ ${result.shortUrl}`;
    downloadQr.href = resultQr.src;
    downloadQr.download = `shorturl-${result.shortCode}.png`;
    resultCard.hidden = false;
    currentPage = 1;
    await loadHistory(1);
  } catch (error) {
    formMessage.textContent = error.message;
  } finally {
    shortenButton.disabled = false;
    shortenButton.querySelector('.button-label').textContent = 'ย่อลิงก์';
  }
});

copyButton.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(resultLink.href);
    copyMessage.textContent = 'คัดลอกลิงก์แล้ว';
  } catch {
    copyMessage.textContent = 'คัดลอกไม่สำเร็จ กรุณาเลือกคัดลอกลิงก์ด้วยตนเอง';
  }
});

refreshHistoryButton.addEventListener('click', loadHistory);
previousPageButton.addEventListener('click', () => {
  if (currentPage > 1) {
    loadHistory(currentPage - 1);
  }
});
nextPageButton.addEventListener('click', () => {
  if (currentPage < totalPages) {
    loadHistory(currentPage + 1);
  }
});

loadHistory();
