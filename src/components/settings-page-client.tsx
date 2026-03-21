"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/src/components/confirm-dialog";
import type {
  AccountCreateRequest,
  CreditCardCreateRequest,
  CreditCardUpdateRequest,
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

async function patchJson<T>(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = (await response.json()) as T & { message?: string };
  if (!response.ok) throw new Error(payload.message ?? "Request failed");
  return payload;
}

async function deleteJson<T>(url: string) {
  const response = await fetch(url, { method: "DELETE" });
  const payload = (await response.json()) as T & { message?: string };
  if (!response.ok) throw new Error(payload.message ?? "Request failed");
  return payload;
}

type SettingsPanelMode = "account-create" | "card-create" | "card-edit";

export function SettingsPageClient({ initialData }: { initialData: DashboardPayload }) {
  const [accounts, setAccounts] = useState(initialData.accounts);
  const [creditCards, setCreditCards] = useState(initialData.creditCards);
  const [selectedCreditCardId, setSelectedCreditCardId] = useState(initialData.creditCards[0]?.id ?? "");
  const [panelMode, setPanelMode] = useState<SettingsPanelMode>("account-create");
  const [flash, setFlash] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const selectedCreditCard = creditCards.find((card) => card.id === selectedCreditCardId) ?? null;
  const accountNameById = new Map(accounts.map((account) => [account.id, account.name]));

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
      setPanelMode("account-create");
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
      setSelectedCreditCardId(result.creditCard.id);
      setPanelMode("card-edit");
      setFlash("カードを追加しました。");
    } catch (error) {
      setFlash(error instanceof Error ? error.message : "カード追加に失敗しました");
    }
  }

  async function handleUpdateCreditCard(formData: FormData) {
    if (!selectedCreditCard) {
      setFlash("編集対象のカードを選択してください。");
      return;
    }

    try {
      const payload: CreditCardUpdateRequest = {
        name: String(formData.get("name") ?? ""),
        closingDay: Number(formData.get("closingDay") ?? selectedCreditCard.closingDay),
        paymentDay: Number(formData.get("paymentDay") ?? selectedCreditCard.paymentDay),
        settlementAccountId: String(formData.get("settlementAccountId") ?? "") || null,
        currency: String(formData.get("currency") ?? selectedCreditCard.currency),
        isDefault: formData.get("isDefault") === "on"
      };
      const result = await patchJson<{ creditCard: DashboardPayload["creditCards"][number] }>(
        `/api/credit-cards/${selectedCreditCard.id}`,
        payload
      );
      setCreditCards((current) =>
        current.map((card) => {
          if (payload.isDefault) {
            if (card.id === result.creditCard.id) return result.creditCard;
            return { ...card, isDefault: false };
          }

          return card.id === result.creditCard.id ? result.creditCard : card;
        })
      );
      setPanelMode("card-edit");
      setFlash("カードを更新しました。");
    } catch (error) {
      setFlash(error instanceof Error ? error.message : "カード更新に失敗しました");
    }
  }

  async function handleDeleteCreditCard() {
    if (!selectedCreditCard) {
      setFlash("削除対象のカードを選択してください。");
      return;
    }

    try {
      const result = await deleteJson<{ creditCard: DashboardPayload["creditCards"][number] }>(
        `/api/credit-cards/${selectedCreditCard.id}`
      );
      setCreditCards((current) => {
        const nextCards = current.filter((card) => card.id !== result.creditCard.id);
        setSelectedCreditCardId((currentSelectedId) => {
          if (currentSelectedId !== result.creditCard.id) {
            return currentSelectedId;
          }

          return nextCards[0]?.id ?? "";
        });
        return nextCards;
      });
      setPanelMode(creditCards.length > 1 ? "card-edit" : "card-create");
      setFlash("カードを削除しました。");
    } catch (error) {
      setFlash(error instanceof Error ? error.message : "カード削除に失敗しました");
    }
  }

  return (
    <section className="wire-panel wire-section">
      <ConfirmDialog
        open={isDeleteDialogOpen}
        title="カード削除の確認"
        description={
          selectedCreditCard
            ? `${selectedCreditCard.name} を削除します。この操作は元に戻せません。`
            : ""
        }
        confirmLabel="削除する"
        tone="danger"
        onCancel={() => setIsDeleteDialogOpen(false)}
        onConfirm={() => {
          setIsDeleteDialogOpen(false);
          void handleDeleteCreditCard();
        }}
      />
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
              <button type="button" className="wire-small-button" onClick={() => setPanelMode("account-create")}>
                口座を追加
              </button>
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
              <button type="button" className="wire-small-button" onClick={() => setPanelMode("card-create")}>
                カードを追加
              </button>
            </div>
            <div className="wire-list">
              {creditCards.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  className={`wire-list-item wire-list-item-button ${selectedCreditCardId === card.id ? "wire-list-item-selected" : ""}`}
                  onClick={() => {
                    setSelectedCreditCardId(card.id);
                    setPanelMode("card-edit");
                  }}
                >
                  <div className="wire-list-top">
                    <div className="wire-row-title">{card.name}</div>
                    <div>{card.isDefault ? "default" : "card"}</div>
                  </div>
                  <div className="wire-row-sub">
                    締日 {card.closingDay} / 支払日 {card.paymentDay} /{" "}
                    {card.settlementAccountId ? accountNameById.get(card.settlementAccountId) ?? "引落口座未設定" : "引落口座未設定"}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="wire-settings-column">
          <div className="wire-box wire-form-panel">
            <div className="wire-box-head">
              <span className="wire-label">
                {panelMode === "account-create"
                  ? "Add Account"
                  : panelMode === "card-create"
                    ? "Add Card"
                    : "Edit Card"}
              </span>
            </div>
            {panelMode === "account-create" ? (
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
            ) : null}

            {panelMode === "card-create" ? (
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
            ) : null}

            {panelMode === "card-edit" ? (
              selectedCreditCard ? (
                <form key={selectedCreditCard.id} action={handleUpdateCreditCard}>
                  <div className="wire-form-grid wire-form-grid-settings">
                    <input name="name" className="wire-input" defaultValue={selectedCreditCard.name} placeholder="カード名" />
                    <input
                      name="closingDay"
                      type="number"
                      min="1"
                      max="31"
                      defaultValue={selectedCreditCard.closingDay}
                      className="wire-input"
                      placeholder="締日"
                    />
                    <input
                      name="paymentDay"
                      type="number"
                      min="1"
                      max="31"
                      defaultValue={selectedCreditCard.paymentDay}
                      className="wire-input"
                      placeholder="支払日"
                    />
                    <select name="settlementAccountId" className="wire-input" defaultValue={selectedCreditCard.settlementAccountId ?? ""}>
                      <option value="">引落口座未指定</option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                    </select>
                    <input name="currency" className="wire-input" defaultValue={selectedCreditCard.currency} />
                    <label className="wire-check">
                      <input name="isDefault" type="checkbox" defaultChecked={selectedCreditCard.isDefault} />
                      default card にする
                    </label>
                  </div>
                  <div className="wire-form-actions">
                    <button type="submit" className="wire-button">カードを更新</button>
                    <button
                      type="button"
                      className="wire-small-button wire-small-button-ghost"
                      onClick={() => setIsDeleteDialogOpen(true)}
                    >
                      カードを削除
                    </button>
                  </div>
                </form>
              ) : (
                <div className="wire-row-note">編集したいカードを左の一覧から選んでください。</div>
              )
            ) : null}
          </div>
        </div>
      </div>
      {flash ? <div className="wire-flash">{flash}</div> : null}
    </section>
  );
}
