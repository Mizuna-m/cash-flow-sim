import test from "node:test";
import assert from "node:assert/strict";
import { analyzeSpreadsheetImport } from "@/src/application/services/import-spreadsheet";

test("analyzeSpreadsheetImport maps expense sheet rows to negative transactions", () => {
  const analysis = analyzeSpreadsheetImport({
    workbook: {
      fileName: "Financial Analysis - 2025.ods",
      sheets: [
        {
          name: "種別",
          rows: [
            ["GID", "種別名", "GGID", "種別グループ"],
            ["15", "交友外食", "1", "食費"]
          ]
        },
        {
          name: "支出",
          rows: [
            ["日付", "取引先", "相手詳細", "内容", "金額", "GID", "種別", "備考", "PID", "プロジェクト"],
            ["2025/01/02", "梅響同窓会", "", "一次会", "¥4,500", "15", "交友外食", "", "12", "梅響同窓会"]
          ]
        }
      ]
    }
  });

  assert.equal(analysis.canImport, true);
  assert.equal(analysis.selectedProfile, "financial-analysis-expense");
  assert.equal(analysis.transactions[0]?.amount, "-4500.00");
  assert.deepEqual(analysis.transactions[0]?.categoryPath, ["食費", "交友外食"]);
  assert.deepEqual(analysis.transactions[0]?.tags, { project: ["梅響同窓会"] });
});

test("analyzeSpreadsheetImport maps income sheet rows to positive transactions", () => {
  const analysis = analyzeSpreadsheetImport({
    workbook: {
      fileName: "Financial Analysis - 2025.ods",
      sheets: [
        {
          name: "収入",
          rows: [
            ["日付/請求日基点", "取引先", "内容", "金額", "GID", "種別", "備考", "PID", "プロジェクト名"],
            ["2025/01/01", "Akira", "生活費", "¥137,000", "1001", "生活費", "", "", "-"]
          ]
        }
      ]
    }
  });

  assert.equal(analysis.canImport, true);
  assert.equal(analysis.selectedProfile, "financial-analysis-income");
  assert.equal(analysis.transactions[0]?.amount, "137000.00");
  assert.equal(analysis.transactions[0]?.payee, "Akira");
  assert.equal(analysis.transactions[0]?.description, "生活費");
});

test("analyzeSpreadsheetImport applies payee-based suggestions from existing transactions", () => {
  const analysis = analyzeSpreadsheetImport({
    workbook: {
      fileName: "Financial Analysis - 2025.ods",
      sheets: [
        {
          name: "支出",
          rows: [
            ["日付", "取引先", "相手詳細", "内容", "金額", "GID", "種別", "備考", "PID", "プロジェクト"],
            ["2025/01/02", "FamilyMart", "", "朝ごはん", "¥500", "15", "", "", "", ""]
          ]
        }
      ]
    },
    transactionHistory: [
      {
        id: "t-1",
        date: "2024-12-01",
        amount: "-320.00",
        accountId: "account-1",
        payee: "FamilyMart",
        payeeDetail: [],
        description: "Coffee",
        note: "",
        categoryPath: ["食費", "日常外食"],
        tags: { project: ["日常"] },
        cardId: "card-1",
        orderIndex: 0,
        createdAt: "",
        updatedAt: ""
      }
    ]
  });

  assert.equal(analysis.canImport, true);
  assert.equal(analysis.transactions[0]?.accountId, "account-1");
  assert.equal(analysis.transactions[0]?.cardId, "card-1");
  assert.deepEqual(analysis.transactions[0]?.categoryPath, ["食費", "日常外食"]);
  assert.deepEqual(analysis.transactions[0]?.tags, { project: ["日常"] });
  assert.deepEqual(analysis.previewRows[0]?.appliedSuggestionFields, [
    "categoryPath",
    "project",
    "accountId",
    "cardId"
  ]);
});
