import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Search, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  Wallet,
  Calendar,
  User as UserIcon,
  Tag
} from "lucide-react";
import { useTransactions } from "@/hooks/useTransactions";
import { formatDate, formatFCFA, methodLabel } from "@/lib/format";
import { exportToCSV } from "@/lib/export";
import { toast } from "sonner";

export default function AdminTransactions() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const { data, isLoading } = useTransactions({
    search,
    page,
    pageSize,
  });

  const transactions = data?.transactions ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  const handleExport = () => {
    if (transactions.length === 0) {
      toast.error("Aucune donnée à exporter");
      return;
    }
    
    const exportData = transactions.map(t => ({
      Reference: t.reference,
      Date: formatDate(t.created_at),
      Client: t.client_name,
      Collecteur: t.collector_name,
      Methode: methodLabel(t.method),
      Montant: t.amount,
      Statut: t.status,
      Notes: t.notes ?? ""
    }));

    exportToCSV(exportData, `transactions-gadzola-${new Date().toISOString().split('T')[0]}.csv`);
    toast.success("Exportation réussie");
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-[1600px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Transactions</h1>
            <p className="text-muted-foreground">Historique complet des opérations financières.</p>
          </div>
          <Button onClick={handleExport} variant="outline" className="shrink-0 gap-2 border-primary/20 hover:bg-primary/5">
            <Download className="h-4 w-4" />
            Exporter en CSV
          </Button>
        </div>

        <Card className="border-none shadow-premium overflow-hidden">
          <CardHeader className="bg-muted/30 pb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Liste des opérations</CardTitle>
                <CardDescription>{total} transactions trouvées</CardDescription>
              </div>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher une référence…"
                  className="pl-9 bg-background/50"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1); // Reset to first page on search
                  }}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Chargement des transactions…</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-20">
                <Tag className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-muted-foreground font-medium">Aucune transaction trouvée</p>
                <p className="text-sm text-muted-foreground/60 mt-1">Essayez de modifier vos critères de recherche.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/20">
                      <TableRow>
                        <TableHead className="w-[140px]">Référence</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Collecteur</TableHead>
                        <TableHead>Méthode</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Montant</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((t) => (
                        <TableRow key={t.id} className="hover:bg-muted/5 transition-colors">
                          <TableCell className="font-mono text-xs font-medium text-primary">
                            {t.reference}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="font-medium whitespace-nowrap">{t.client_name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            <span className="whitespace-nowrap">{t.collector_name}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Wallet className="h-3.5 w-3.5" />
                              <span className="text-xs whitespace-nowrap">{methodLabel(t.method)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground uppercase text-[10px] tracking-wider">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3.5 w-3.5" />
                              <span className="whitespace-nowrap">{formatDate(t.created_at)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={t.status === 'completed' ? 'success' : 'secondary'} className="capitalize text-[10px] px-2 py-0">
                              {t.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-bold text-base whitespace-nowrap">
                            {formatFCFA(t.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between p-4 border-t bg-muted/10">
                    <p className="text-xs text-muted-foreground">
                      Page {page} sur {totalPages} ({total} résultats)
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <div className="flex gap-1">
                        {[...Array(Math.min(5, totalPages))].map((_, i) => {
                          const p = i + 1;
                          // Simple pagination logic for now
                          return (
                            <Button
                              key={p}
                              variant={page === p ? "default" : "outline"}
                              size="icon"
                              className="h-8 w-8 text-xs"
                              onClick={() => setPage(p)}
                            >
                              {p}
                            </Button>
                          );
                        })}
                        {totalPages > 5 && <span className="px-2 self-center">...</span>}
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
