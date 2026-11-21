// 北町町内会 お知らせ管理用 Google Apps Script
// このファイルをGoogle Apps Scriptプロジェクトへ貼り付けてウェブアプリとして公開します。

const SPREADSHEET_ID = '1ALstLpWWSMPcdOjt6Egh5Msxcoo_bshHvB4uInvlqyk';
const SHEET_NAME = '新着情報';

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
    sheet.appendRow(['日付', 'カテゴリ', '内容', 'リンク']);
  }
  return sheet;
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
  if (form.file && form.file.data && form.file.name) {
    if (form.file.name.toLowerCase().endsWith('.pdf') === false) {
      throw new Error('PDFファイルのみアップロードできます。');
    }
    const bytes = Utilities.base64Decode(form.file.data);
    const blob = Utilities.newBlob(bytes, form.file.mimeType || 'application/pdf', form.file.name);

    const folderId = PropertiesService.getScriptProperties().getProperty('DRIVE_FOLDER_ID');
    let folder;
    if (folderId) {
      folder = DriveApp.getFolderById(folderId);
    } else {
      folder = DriveApp.getRootFolder();
    }

    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    const direct = 'https://drive.google.com/uc?export=download&id=' + file.getId();
    link = direct;
  } else if (form.link) {
    link = String(form.link).trim();
  }

  const sheet = getSheet();
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    sheet.appendRow([date, category, content, link]);
  } finally {
    lock.releaseLock();
  }

  return { ok: true, link: link };
}

function deleteNews(rowIndex) {
  requireAccess();
  const index = Number(rowIndex);
  if (!index || index < 2) {
    throw new Error('削除対象が正しくありません。');
  }
  const sheet = getSheet();
  sheet.deleteRow(index);
  return { ok: true };
}
