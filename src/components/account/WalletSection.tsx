import { useEffect, useState } from "react";
import { userProfileApi, WalletTransaction } from "@/lib/user-api";
import { Card, CardContent } from "@/components/ui/card";
import Icon from "@/components/ui/icon";

const TYPE_CONFIG: Record<string, { label: string; icon: string; color: string; sign: string }> = {
  deposit:    { label: "Пополнение",  icon: "ArrowDownLeft",  color: "text-emerald-600", sign: "+" },
  refund:     { label: "Возврат",     icon: "RotateCcw",      color: "text-emerald-600", sign: "+" },
  bonus:      { label: "Бонус",       icon: "Gift",           color: "text-violet-600",  sign: "+" },
  cashback:   { label: "Кэшбэк",     icon: "Percent",        color: "text-blue-600",    sign: "+" },
  withdrawal: { label: "Вывод",       icon: "ArrowUpRight",   color: "text-orange-600",  sign: "−" },
  fee:        { label: "Списание",    icon: "Minus",          color: "text-red-600",     sign: "−" },
};

function formatAmount(amount: number) {
  return (amount / 100).toLocaleString("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export default function WalletSection() {
  const [walletBalance, setWalletBalance] = useState(0);
  const [bonusBalance, setBonusBalance] = useState(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userProfileApi.getWallet()
      .then((d) => {
        setWalletBalance(d.wallet_balance);
        setBonusBalance(d.bonus_balance);
        setTransactions(d.transactions);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 flex items-center gap-3">
          <Icon name="Loader2" size={16} className="animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Загрузка...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Баланс */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Icon name="Wallet" size={16} className="text-emerald-600" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">Кошелёк</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{formatAmount(walletBalance)} ₽</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                <Icon name="Gift" size={16} className="text-violet-600" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">Бонусы</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{formatAmount(bonusBalance)} ₽</div>
          </CardContent>
        </Card>
      </div>

      {/* История */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">История операций</h3>
          {transactions.length === 0 ? (
            <div className="text-center py-6">
              <Icon name="ReceiptText" size={28} className="text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Операций пока нет</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => {
                const cfg = TYPE_CONFIG[tx.type] || { label: tx.type, icon: "Circle", color: "text-muted-foreground", sign: "" };
                const isPositive = ["deposit", "refund", "bonus", "cashback"].includes(tx.type);
                return (
                  <div key={tx.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                    <div className={`w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0`}>
                      <Icon name={cfg.icon} size={14} className={cfg.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground leading-tight">{cfg.label}</p>
                      {tx.description && (
                        <p className="text-xs text-muted-foreground truncate">{tx.description}</p>
                      )}
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(tx.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <div className={`text-sm font-semibold flex-shrink-0 ${isPositive ? "text-emerald-600" : "text-foreground"}`}>
                      {cfg.sign}{formatAmount(tx.amount)} ₽
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Заглушка вывода */}
      <Card className="border-0 shadow-sm bg-muted/30">
        <CardContent className="p-4 flex items-center gap-3">
          <Icon name="Info" size={16} className="text-muted-foreground flex-shrink-0" />
          <p className="text-xs text-muted-foreground">Пополнение и вывод средств будут доступны в ближайшее время. Следите за обновлениями.</p>
        </CardContent>
      </Card>
    </div>
  );
}
