import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Icon from "@/components/ui/icon";
import { crmApi, CrmImportRow, CrmImportResult } from "@/lib/crm-api";

interface Props {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

/** Простой CSV-парсер с поддержкой кавычек, экранирования и разделителей `,` `;` `\t`. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  // Определяем разделитель по первой строке
  const firstLine = text.split(/\r?\n/, 1)[0] || "";
  const sep = (firstLine.match(/;/g)?.length || 0) > (firstLine.match(/,/g)?.length || 0)
    ? ";"
    : firstLine.includes("\t") ? "\t" : ",";

  let cur = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === sep) {
        row.push(cur.trim());
        cur = "";
      } else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(cur.trim());
        cur = "";
        if (row.some((c) => c.length > 0)) rows.push(row);
        row = [];
      } else {
        cur += ch;
      }
    }
  }
  if (cur.length > 0 || row.length > 0) {
    row.push(cur.trim());
    if (row.some((c) => c.length > 0)) rows.push(row);
  }
  return rows;
}

/** Сопоставление заголовков с полями. Не зависит от регистра и языка. */
const FIELD_ALIASES: Record<string, keyof CrmImportRow> = {
  "name": "name", "имя": "name", "фио": "name", "клиент": "name", "full name": "name",
  "phone": "phone", "телефон": "phone", "номер": "phone", "tel": "phone", "mobile": "phone",
  "email": "email", "почта": "email", "e-mail": "email", "mail": "email",
  "telegram": "telegram", "тг": "telegram", "tg": "telegram",
  "vk": "vk", "вк": "vk", "вконтакте": "vk",
  "note": "note", "заметка": "note", "комментарий": "note", "comment": "note", "notes": "note",
};

function detectMapping(headers: string[]): (keyof CrmImportRow | null)[] {
  return headers.map((h) => {
    const key = h.toLowerCase().trim();
    return FIELD_ALIASES[key] ?? null;
  });
}

export default function ImportCsvDialog({ open, onClose, onImported }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<CrmImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<CrmImportResult | null>(null);

  const reset = () => {
    setRows([]); setFileName(""); setError(""); setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError("");
    setResult(null);

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || "");
        const matrix = parseCsv(text);
        if (matrix.length === 0) {
          setError("Файл пустой");
          return;
        }
        const headers = matrix[0];
        const mapping = detectMapping(headers);

        if (!mapping.includes("name")) {
          setError("Не нашёл колонку «Имя». Добавьте заголовок: name / имя / фио");
          return;
        }

        const parsed: CrmImportRow[] = [];
        for (let i = 1; i < matrix.length; i++) {
          const r = matrix[i];
          const obj: CrmImportRow = { name: "" };
          mapping.forEach((field, idx) => {
            if (!field) return;
            const val = (r[idx] || "").trim();
            if (val) obj[field] = val;
          });
          if (obj.name) parsed.push(obj);
        }
        if (parsed.length === 0) {
          setError("Не нашёл ни одной валидной строки с именем");
          return;
        }
        if (parsed.length > 5000) {
          setError(`Слишком много строк (${parsed.length}). Максимум 5000 за раз.`);
          return;
        }
        setRows(parsed);
      } catch (err) {
        setError("Не удалось прочитать файл: " + String(err));
      }
    };
    reader.onerror = () => setError("Ошибка чтения файла");
    reader.readAsText(file, "utf-8");
  };

  const handleImport = async () => {
    if (rows.length === 0) return;
    setImporting(true);
    setError("");
    try {
      const r = await crmApi.importCsv(rows);
      setResult(r);
      onImported();
    } catch (e) {
      setError(String(e));
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const preview = rows.slice(0, 5);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name="Upload" size={18} />
            Импорт клиентов из CSV
          </DialogTitle>
        </DialogHeader>

        {!result && (
          <div className="space-y-4">
            <Card className="border-0 shadow-sm bg-muted/40">
              <CardContent className="p-3 text-xs space-y-1">
                <div className="font-medium text-foreground">Какие колонки нужны:</div>
                <div className="text-muted-foreground">
                  Обязательно: <code className="bg-background px-1 rounded">name</code> (или «Имя»)
                </div>
                <div className="text-muted-foreground">
                  Необязательно: <code className="bg-background px-1 rounded">phone</code>,{" "}
                  <code className="bg-background px-1 rounded">email</code>,{" "}
                  <code className="bg-background px-1 rounded">telegram</code>,{" "}
                  <code className="bg-background px-1 rounded">vk</code>,{" "}
                  <code className="bg-background px-1 rounded">note</code>
                </div>
                <div className="text-muted-foreground">
                  Дубли по телефону или email пропускаются автоматически.
                </div>
              </CardContent>
            </Card>

            <div>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv,text/plain"
                onChange={handleFile}
                className="hidden"
                id="crm-csv-input"
              />
              <label
                htmlFor="crm-csv-input"
                className="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl py-8 cursor-pointer hover:bg-muted/40 transition-colors"
              >
                <Icon name="FileText" size={20} className="text-muted-foreground" />
                <span className="text-sm">
                  {fileName ? <><b>{fileName}</b> · нажмите для смены</> : "Выберите CSV-файл"}
                </span>
              </label>
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-2 flex items-start gap-2">
                <Icon name="AlertCircle" size={14} className="mt-0.5" />
                {error}
              </div>
            )}

            {rows.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  Найдено строк: <span className="font-semibold text-foreground">{rows.length}</span>. Предпросмотр:
                </div>
                <Card className="border-0 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50 text-muted-foreground uppercase">
                        <tr>
                          <th className="text-left px-2 py-1.5 font-semibold">Имя</th>
                          <th className="text-left px-2 py-1.5 font-semibold">Телефон</th>
                          <th className="text-left px-2 py-1.5 font-semibold">Email</th>
                          <th className="text-left px-2 py-1.5 font-semibold">TG</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((r, i) => (
                          <tr key={i} className="border-t border-border/50">
                            <td className="px-2 py-1.5">{r.name}</td>
                            <td className="px-2 py-1.5 text-muted-foreground">{r.phone || "—"}</td>
                            <td className="px-2 py-1.5 text-muted-foreground">{r.email || "—"}</td>
                            <td className="px-2 py-1.5 text-muted-foreground">{r.telegram || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
                {rows.length > 5 && (
                  <div className="text-xs text-muted-foreground">…и ещё {rows.length - 5} строк</div>
                )}
              </div>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" size="sm" onClick={handleClose}>Отмена</Button>
              <Button
                size="sm"
                onClick={handleImport}
                disabled={rows.length === 0 || importing}
                className="gap-1.5"
              >
                {importing ? (
                  <Icon name="Loader2" size={14} className="animate-spin" />
                ) : (
                  <Icon name="Upload" size={14} />
                )}
                Импортировать {rows.length > 0 && `(${rows.length})`}
              </Button>
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-emerald-600 font-medium">
              <Icon name="CheckCircle2" size={18} />
              Импорт завершён
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-3 text-center">
                  <div className="text-xs text-muted-foreground">Всего строк</div>
                  <div className="font-bold text-lg">{result.total}</div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm bg-emerald-50">
                <CardContent className="p-3 text-center">
                  <div className="text-xs text-muted-foreground">Добавлено</div>
                  <div className="font-bold text-lg text-emerald-700">{result.created}</div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm bg-amber-50">
                <CardContent className="p-3 text-center">
                  <div className="text-xs text-muted-foreground">Дублей пропущено</div>
                  <div className="font-bold text-lg text-amber-700">{result.skipped_duplicates}</div>
                </CardContent>
              </Card>
            </div>

            {result.errors.length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-3 text-xs space-y-1">
                  <div className="font-medium text-destructive flex items-center gap-1 mb-1">
                    <Icon name="AlertTriangle" size={12} />
                    Ошибки ({result.errors.length}):
                  </div>
                  {result.errors.slice(0, 10).map((e, i) => (
                    <div key={i} className="text-muted-foreground">
                      Строка {e.row}: {e.reason}
                    </div>
                  ))}
                  {result.errors.length > 10 && (
                    <div className="text-muted-foreground italic">…и ещё {result.errors.length - 10}</div>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => { reset(); }}>
                Импортировать ещё
              </Button>
              <Button size="sm" onClick={handleClose}>Готово</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
