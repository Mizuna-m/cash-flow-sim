import test from "node:test";
import assert from "node:assert/strict";
import { buildAnalysisSummary } from "@/src/application/services/build-analysis-summary";

test("buildAnalysisSummary groups transactions into project, category, and group summaries", () => {
  const summary = buildAnalysisSummary({
    startDate: "2026-03-01",
    endDate: "2026-04-30",
    transactions: [
      {
        id: "t1",
        date: "2026-03-02",
        amount: "-3200.00",
        accountId: "a1",
        payee: "FamilyMart",
        payeeDetail: ["MSH日本橋箱崎ビル店"],
        description: "Groceries",
        note: "",
        categoryPath: ["食費", "日用品"],
        tags: { project: ["日常"] },
        cardId: null,
        orderIndex: 1,
        createdAt: "",
        updatedAt: ""
      },
      {
        id: "t2",
        date: "2026-03-05",
        amount: "-45000.00",
        accountId: null,
        payee: "Travel Portal",
        payeeDetail: [],
        description: "Travel booking",
        note: "",
        categoryPath: ["交通費", "高速代"],
        tags: { project: ["春の旅行"] },
        cardId: "card-1",
        orderIndex: 1,
        createdAt: "",
        updatedAt: ""
      },
      {
        id: "t3",
        date: "2026-04-01",
        amount: "280000.00",
        accountId: "a1",
        payee: "Payroll",
        payeeDetail: [],
        description: "Salary",
        note: "",
        categoryPath: ["収入", "給与"],
        tags: { project: ["生活"] },
        cardId: null,
        orderIndex: 1,
        createdAt: "",
        updatedAt: ""
      }
    ]
  });

  assert.deepEqual(summary.months, ["2026-03", "2026-04"]);
  assert.deepEqual(summary.totals, {
    income: "280000.00",
    expense: "48200.00",
    net: "231800.00",
    count: 3
  });

  assert.equal(summary.projects[0]?.label, "生活");
  assert.equal(summary.projects[0]?.income, "280000.00");
  assert.equal(summary.projects[1]?.label, "春の旅行");
  assert.equal(summary.projects[1]?.expense, "45000.00");

  const foodGroup = summary.groups.find((group) => group.label === "食費");
  assert.equal(foodGroup?.expense, "3200.00");

  const tollCategory = summary.categories.find((category) => category.label === "交通費 > 高速代");
  assert.deepEqual(tollCategory?.monthly, [
    {
      month: "2026-03",
      income: "0.00",
      expense: "45000.00",
      net: "-45000.00"
    },
    {
      month: "2026-04",
      income: "0.00",
      expense: "0.00",
      net: "0.00"
    }
  ]);
});
