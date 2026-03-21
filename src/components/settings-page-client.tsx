"use client";

import { useState } from "react";
import type {
  AccountCreateRequest,
  CreditCardCreateRequest,
  DashboardPayload
} from "@/src/lib/openapi-contract";

async function postJson<T>(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = (await response.json()) as T & { message?: string };
  if (!response.ok) throw new Error(payload.message ?? "Request failed");
  return payload;
}

export function SettingsPageClient({ initialData }: { initialData: DashboardPayload }) {
  const [accounts, setAccounts] = useState(initialData.accounts);
  const [creditCards, setCreditCards] = useState(initialData.creditCards);
  const [flash, setFlash] = useState("");

  async function handleCreateAccount(formData: FormData) {
    try {
      const payload: AccountCreateRequest = {
        name: String(formData.get("name") ?? ""),
        type: String(formData.get("type") ?? "bank") as AccountCreateRequest["type"],
        currency: String(formData.get("currency") ?? "JPY"),
        initialBalance: String(formData.get("initialBalance") ?? "0")
      };
      const result = await postJson<{ account: DashboardPayload["accounts"][number] }>("/api/accounts", payload);
      setAccounts((current) => [...current, result.account]);
      setFlash("口座を追加しました。");
    } catch (error) {
      setFlash(error instanceof Error ? error.message : "追加に失敗しました");
    }
  }

  async function handleCreateCreditCard(formData: FormData) {
    try {
      const payload: CreditCardCreateRequest = {
        name: String(formData.get("name") ?? ""),
        closingDay: Number(formData.get("closingDay") ?? 25),
        paymentDay: Number(formData.get("paymentDay") ?? 10),
        settlementAccountId: String(formData.get("settlementAccountId") ?? "") || null,
        currency: String(formData.get("currency") ?? "JPY"),
        isDefault: formData.get("isDefault") === "on"
      };
      const result = await postJson<{ creditCard: DashboardPayload["creditCards"][number] }>(
        "/api/credit-cards",
        payload
      );
      setCreditCards((current) => {
        const next = payload.isDefault
          ? current.map((card) => ({ ...card, isDefault: false }))
          : current;
        return [...next, result.creditCard];
      });
      setFlash("カードを追加しました。");
    } catch (error) {
      setFlash(error instanceof Error ? error.message : "カード追加に失敗しました");
    }
  }

  return (
    <section className="wire-panel wire-section">
      <div className="wire-section-head">
        <div>
          <h2 className="wire-section-title">設定 / マスタ</h2>
          <p className="wire-section-meta">
            左で現在の登録内容を確認し、右で追加操作を行う。表示と入力の役割を分離して混線を減らす。
          </p>
        </div>
      </div>

      <div className="wire-settings-layout">
        <div className="wire-settings-column">
          <div className="wire-box wire-form-panel">
            <div className="wire-box-head">
              <span className="wire-label">Accounts</span>
            </div>
            <div className="wire-list">
              {accounts.map((account) => (
                <div key={account.id} className="wire-list-item">
                  <div className="wire-list-top">
                    <div className="wire-row-title">{account.name}</div>
                    <div>{account.type}</div>
                  </div>
                  <div className="wire-row-sub">{account.currency} / {account.initialBalance}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="wire-box wire-form-panel">
            <div className="wire-box-head">
              <span className="wire-label">Cards</span>
            </div>
            <div className="wire-list">
              {creditCards.map((card) => (
                <div key={card.id} className="wire-list-item">
                  <div className="wire-list-top">
                    <div className="wire-row-title">{card.name}</div>
                    <div>{card.isDefault ? "default" : "card"}</div>
                  </div>
                  <div className="wire-row-sub">
                    締日 {card.closingDay} / 支払日 {card.paymentDay} /{" "}
                    {card.settlementAccountId ?? "引落口座未設定"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="wire-settings-column">
          <div className="wire-box wire-form-panel">
            <div className="wire-box-head">
              <span className="wire-label">Add Account</span>
            </div>
            <form action={handleCreateAccount}>
              <div className="wire-form-grid wire-form-grid-settings">
                <input name="name" className="wire-input" placeholder="口座名" />
                <select name="type" className="wire-input" defaultValue="bank">
                  <option value="bank">銀行</option>
                  <option value="cash">現金</option>
                  <option value="credit">クレジット</option>
                  <option value="loan">借入</option>
                  <option value="investment">投資</option>
                </select>
                <input name="currency" className="wire-input" defaultValue="JPY" />
                <input
                  name="initialBalance"
                  type="number"
                  step="0.01"
                  className="wire-input"
                  placeholder="初期残高"
                />
              </div>
              <div className="wire-form-actions">
                <button type="submit" className="wire-button">口座を追加</button>
              </div>
            </form>
          </div>

          <div className="wire-box wire-form-panel">
            <div className="wire-box-head">
              <span className="wire-label">Add Card</span>
            </div>
            <form action={handleCreateCreditCard}>
              <div className="wire-form-grid wire-form-grid-settings">
                <input name="name" className="wire-input" placeholder="カード名" />
                <input
                  name="closingDay"
                  type="number"
                  min="1"
                  max="31"
                  defaultValue="25"
                  className="wire-input"
                  placeholder="締日"
                />
                <input
                  name="paymentDay"
                  type="number"
                  min="1"
                  max="31"
                  defaultValue="10"
                  className="wire-input"
                  placeholder="支払日"
                />
                <select name="settlementAccountId" className="wire-input" defaultValue="">
                  <option value="">引落口座未指定</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
                <input name="currency" className="wire-input" defaultValue="JPY" />
                <label className="wire-check">
                  <input name="isDefault" type="checkbox" />
                  default card にする
                </label>
              </div>
              <div className="wire-form-actions">
                <button type="submit" className="wire-button">カードを追加</button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {flash ? <div className="wire-flash">{flash}</div> : null}
    </section>
  );
}
