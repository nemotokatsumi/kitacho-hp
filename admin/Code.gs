// 北町町内会 お知らせ管理用 Google Apps Script
// このファイルをGoogle Apps Scriptプロジェクトへ貼り付けてウェブアプリとして公開します。

const SPREADSHEET_ID = '1ALstLpWWSMPcdOjt6Egh5Msxcoo_bshHvB4uInvlqyk';
const SHEET_NAME = '新着情報';
const DEFAULT_CALENDAR_ID = 'kitacho.nishikawaguchi@gmail.com';

function doGet() {
  const html = HtmlService.createTemplateFromFile('Index');
  html.userEmail = Session.getEffectiveUser().getEmail();
  return html.evaluate()
    .setTitle('北町町内会 お知らせ管理')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function isAllowed() {
  const email = String(Session.getEffectiveUser().getEmail()).toLowerCase();
  const allowList = PropertiesService.getScriptProperties().getProperty('ADMIN_EMAILS') || '';
  const allowed = allowList.split(/[,、\n]/).map(v => v.trim().toLowerCase()).filter(Boolean);
  return allowed.includes(email);
}

function requireAccess() {
  if (!isAllowed()) {
    throw new Error('このアカウントには登録権限がありません。管理者へお問い合わせください。');
  }
}

function listNews() {
  requireAccess();
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  const rows = [];
  for (let row = lastRow; row >= 2; row--) {
    const values = sheet.getRange(row, 1, 1, 4).getDisplayValues()[0];
    if (values.some(value => value !== '')) {
      rows.push({
        rowIndex: row,
        date: values[0] || '',
        category: values[1] || '',
        content: values[2] || '',
        link: values[3] || ''
      });
    }
  }
  return rows.slice(0, 100);
}

function getSheet() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['日付', 'カテゴリ', '内容', 'リンク', 'Calendar Event ID', 'Calendar ID']);
  } else {
    if (!sheet.getRange(1, 5).getValue()) sheet.getRange(1, 5).setValue('Calendar Event ID');
    if (!sheet.getRange(1, 6).getValue()) sheet.getRange(1, 6).setValue('Calendar ID');
  }
  return sheet;
}

function analyzeFlyer(file) {
  requireAccess();
  if (!file || !file.data || !file.name) throw new Error('チラシ画像またはPDFを選択してください。');

  const mimeType = String(file.mimeType || '').toLowerCase();
  const supportedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
  if (!supportedTypes.includes(mimeType)) throw new Error('PDF、JPEG、PNG、WebP、HEIC形式を選択してください。');
  if (file.data.length > 14 * 1024 * 1024) throw new Error('ファイルは10MB以下にしてください。');

  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) throw new Error('管理者がApps Scriptのスクリプト プロパティにGEMINI_API_KEYを設定してください。');

  const prompt = [
    '町内会のチラシからイベント情報を抽出してください。画像内の情報だけを使い、推測しないでください。',
    'JSONだけを返してください。形式: {"title":"短い告知タイトル","category":"防犯/衛生部/行事/防災/お知らせのいずれか","startDate":"YYYY-MM-DDまたは空文字","endDate":"YYYY-MM-DDまたは空文字","startTime":"HH:mmまたは空文字","endTime":"HH:mmまたは空文字","location":"会場または空文字","description":"概要"}',
    '日付が判読できない場合は空文字にし、タイトルは「内容が伝わる短い日本語」にしてください。'
  ].join('\n');
  const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=' + encodeURIComponent(apiKey);
  const response = UrlFetchApp.fetch(endpoint, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      contents: [{parts: [{text: prompt}, {inlineData: {mimeType: mimeType, data: file.data}}]}],
      generationConfig: {responseMimeType: 'application/json', temperature: 0.1}
    }),
    muteHttpExceptions: true
  });
  if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) {
    throw new Error('Gemini APIエラー（HTTP ' + response.getResponseCode() + '）。APIキー、APIの有効化、利用枠を確認してください。');
  }

  const result = JSON.parse(response.getContentText());
  const text = result.candidates && result.candidates[0] && result.candidates[0].content.parts
    .map(part => part.text || '').join('');
  if (!text) throw new Error('チラシから情報を読み取れませんでした。手入力してください。');
  let parsed = JSON.parse(text);
  if (Array.isArray(parsed)) parsed = parsed[0] || {};
  if (!parsed.title && !parsed.startDate && !parsed.startTime) {
    throw new Error('Geminiの抽出結果を確認してください: ' + text.slice(0, 400));
  }
  return {
    title: String(parsed.title || ''),
    category: String(parsed.category || '行事'),
    startDate: normalizeDate_(parsed.startDate),
    endDate: normalizeDate_(parsed.endDate),
    startTime: normalizeTime_(parsed.startTime),
    endTime: normalizeTime_(parsed.endTime),
    location: String(parsed.location || ''),
    description: String(parsed.description || '')
  };
}

function normalizeDate_(value) {
  const date = String(value || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '';
}

function normalizeTime_(value) {
  const time = String(value || '').trim();
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : '';
}

function createCalendarEvent_(form, link) {
  const properties = PropertiesService.getScriptProperties();
  const calendarId = properties.getProperty('CALENDAR_ID') || DEFAULT_CALENDAR_ID;
  const calendar = CalendarApp.getCalendarById(calendarId);
  if (!calendar) throw new Error('登録先カレンダーが見つからないか、編集権限がありません。');

  const startDate = parseDate_(form.date);
  const endDate = parseDate_(form.endDate) || startDate;
  if (endDate < startDate) throw new Error('終了日は開始日以降にしてください。');
  const description = [String(form.description || '').trim(), link ? '添付資料: ' + link : ''].filter(Boolean).join('\n');
  const options = {location: String(form.location || '').trim(), description: description};

  if (!form.startTime) {
    const exclusiveEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() + 1);
    return {event: calendar.createAllDayEvent(form.content, startDate, exclusiveEnd, options), calendarId: calendarId};
  }

  const start = combineDateTime_(startDate, form.startTime);
  let end = form.endTime ? combineDateTime_(endDate, form.endTime) : new Date(start.getTime() + 60 * 60 * 1000);
  if (end <= start) end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
  return {event: calendar.createEvent(form.content, start, end, options), calendarId: calendarId};
}

function parseDate_(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error('開催日を確認してください。');
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function combineDateTime_(date, time) {
  const parts = String(time).split(':').map(Number);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), parts[0], parts[1]);
}

function registerNews(form) {
  requireAccess();
  const date = String(form.date || '').trim();
  const category = String(form.category || '').trim();
  const content = String(form.content || '').trim();

  if (!date || !category || !content) {
    throw new Error('日付、カテゴリ、タイトルは必須です。');
  }

  let link = '';
  let uploadedFile = null;
  let calendarResult = null;
  if (form.file && form.file.data && form.file.name) {
    const mimeType = String(form.file.mimeType || '').toLowerCase();
    if (mimeType !== 'application/pdf' && !mimeType.startsWith('image/')) {
      throw new Error('PDFまたは画像ファイルを選択してください。');
    }
    const blob = Utilities.newBlob(Utilities.base64Decode(form.file.data), mimeType, form.file.name);

    const folderId = PropertiesService.getScriptProperties().getProperty('DRIVE_FOLDER_ID');
    let folder;
    if (folderId) {
      folder = DriveApp.getFolderById(folderId);
    } else {
      folder = DriveApp.getRootFolder();
    }

    uploadedFile = folder.createFile(blob);
    uploadedFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    link = 'https://drive.google.com/uc?export=download&id=' + uploadedFile.getId();
  } else if (form.link) {
    link = String(form.link).trim();
  }

  try {
    if (form.addToCalendar) calendarResult = createCalendarEvent_(form, link);
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      getSheet().appendRow([
        date.replace(/-/g, '.'), category, content, link,
        calendarResult ? calendarResult.event.getId() : '',
        calendarResult ? calendarResult.calendarId : ''
      ]);
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    if (calendarResult) calendarResult.event.deleteEvent();
    if (uploadedFile) uploadedFile.setTrashed(true);
    throw error;
  }

  return {ok: true, link: link, calendarRegistered: !!calendarResult};
}

function deleteNews(rowIndex) {
  requireAccess();
  const index = Number(rowIndex);
  if (!index || index < 2) {
    throw new Error('削除対象が正しくありません。');
  }
  const sheet = getSheet();
  const eventId = sheet.getRange(index, 5).getValue();
  const calendarId = sheet.getRange(index, 6).getValue();
  if (eventId && calendarId) {
    const calendar = CalendarApp.getCalendarById(calendarId);
    const event = calendar && calendar.getEventById(eventId);
    if (event) event.deleteEvent();
  }
  sheet.deleteRow(index);
  return { ok: true };
}
