/**
 * FiCustomerReceiptPrintUtil.js — Customer Receipt print / PDF (matches on-screen receipt card)
 */
sap.ui.define([
    "com/capstone/dashboard/fioridashboard/util/fi/FiCustomerReceiptFormatter"
], function (FiCustomerReceiptFormatter) {
    "use strict";

    function _escapeHtml(sValue) {
        return String(sValue || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function _dashLine() {
        return "<div class=\"dash\"></div>";
    }

    function _row(sLabel, sValueHtml, sValueClass) {
        return "<div class=\"row\">"
            + "<div class=\"label\">" + _escapeHtml(sLabel) + "</div>"
            + "<div class=\"value" + (sValueClass ? " " + sValueClass : "") + "\">" + sValueHtml + "</div>"
            + "</div>";
    }

    function _statusBadgeHtml(vStatus) {
        var sText = FiCustomerReceiptFormatter.formatStatus(vStatus);
        var sUiClass = FiCustomerReceiptFormatter.formatStatusBadgeClass(vStatus);
        var sPrintClass = "status-badge";

        if (sUiClass.indexOf("fiReceiptStatusPaid") >= 0) {
            sPrintClass += " status-paid";
        } else if (sUiClass.indexOf("fiReceiptStatusPartial") >= 0) {
            sPrintClass += " status-partial";
        } else if (sUiClass.indexOf("fiReceiptStatusOpen") >= 0) {
            sPrintClass += " status-open";
        }

        return "<span class=\"" + sPrintClass + "\">" + _escapeHtml(sText) + "</span>";
    }

    function _buildPrintStyles() {
        return [
            "@page { size: A4; margin: 16mm; }",
            "* { box-sizing: border-box; }",
            "body { margin: 0; padding: 24px 0; background: #F8FAFC; font-family: 'Segoe UI', Arial, sans-serif; color: #0F172A; }",
            ".page { display: flex; justify-content: center; }",
            ".paper {",
            "  width: 100%; max-width: 560px; min-height: 720px;",
            "  background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 14px;",
            "  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);",
            "  padding: 32px 34px;",
            "}",
            ".brand {",
            "  margin: 0 0 0.15rem; text-align: center;",
            "  font-family: Georgia, 'Times New Roman', serif;",
            "  font-size: 2rem; font-weight: 800; letter-spacing: 0.04em; color: #0F172A;",
            "}",
            ".title {",
            "  margin: 0.1rem 0 0; text-align: center;",
            "  font-size: 0.78rem; font-weight: 700; letter-spacing: 0.18em; color: #334155;",
            "}",
            ".subtitle {",
            "  margin: 0.2rem 0 0; text-align: center;",
            "  font-size: 0.72rem; font-weight: 500; color: #94A3B8;",
            "}",
            ".tagline {",
            "  margin: 0 0 0.15rem; text-align: center;",
            "  font-size: 0.68rem; color: #CBD5E1;",
            "}",
            ".dash { border-top: 1px dashed #CBD5E1; margin: 18px 0; height: 0; }",
            ".row {",
            "  display: grid; grid-template-columns: minmax(0, 42%) minmax(0, 58%);",
            "  gap: 12px; align-items: start; padding: 7px 0; width: 100%;",
            "}",
            ".label { font-size: 12px; color: #64748B; word-break: break-word; }",
            ".value {",
            "  font-size: 13px; font-weight: 600; color: #0F172A;",
            "  text-align: right; word-break: break-word;",
            "}",
            ".value.name { font-size: 13px; }",
            ".value.rate { font-weight: 700; }",
            ".value.amount-strong { font-size: 15px; font-weight: 800; }",
            ".value.open-amount { font-size: 15px; font-weight: 800; color: #B91C1C; }",
            ".value.status-cell { display: flex; justify-content: flex-end; }",
            ".status-badge {",
            "  display: inline-block; padding: 0.15rem 0.5rem; border-radius: 999px;",
            "  font-size: 11px; font-weight: 700; line-height: 1.3; text-align: center;",
            "  justify-self: end; word-break: break-word;",
            "}",
            ".status-paid { background: #ECFDF5; color: #047857; border: 1px solid #A7F3D0; }",
            ".status-partial { background: #FFF7ED; color: #C2410C; border: 1px solid #FED7AA; }",
            ".status-open { background: #FEF2F2; color: #B91C1C; border: 1px solid #FECACA; }",
            ".footer { margin-top: 0.25rem; padding-top: 0.15rem; text-align: center; }",
            ".footer-thanks { font-size: 0.9rem; font-weight: 600; color: #0F172A; font-style: italic; margin: 0; }",
            ".footer-brand { font-size: 0.72rem; font-weight: 700; letter-spacing: 0.04em; color: #475569; margin: 0.2rem 0 0; }",
            ".footer-note { font-size: 0.62rem; color: #CBD5E1; margin: 0.35rem 0 0; }",
            "@media print {",
            "  body { background: #FFFFFF; padding: 0; }",
            "  .paper { box-shadow: none; border-radius: 0; border: none; max-width: none; min-height: auto; }",
            "}"
        ].join("\n");
    }

    function _buildPrintHtml(oCustomer) {
        var sCurrency = oCustomer.Currency;
        var aParts = [];

        aParts.push("<!DOCTYPE html><html lang=\"ko\"><head><meta charset=\"UTF-8\">");
        aParts.push("<title>FI Customer Receipt - " + _escapeHtml(oCustomer.Customer) + "</title>");
        aParts.push("<style>" + _buildPrintStyles() + "</style></head><body>");
        aParts.push("<div class=\"page\"><article class=\"paper\">");

        aParts.push("<h1 class=\"brand\">UNIQLO</h1>");
        aParts.push("<p class=\"title\">CUSTOMER RECEIPT</p>");
        aParts.push("<p class=\"subtitle\">FI Payment Confirmation</p>");
        aParts.push("<p class=\"tagline\">\uACE0\uAC1D\uBCC4 \uCCAD\uAD6C \u00B7 \uC785\uAE08 \uD655\uC778\uC11C</p>");

        aParts.push(_dashLine());
        aParts.push(_row("Company Code", _escapeHtml(oCustomer.CompanyCode)));
        aParts.push(_row("Customer", _escapeHtml(oCustomer.Customer)));
        aParts.push(_row("Customer Name", _escapeHtml(oCustomer.CustomerName), "name"));
        aParts.push(_row("Status", _statusBadgeHtml(oCustomer.Status), "status-cell"));
        aParts.push(_row("Currency", _escapeHtml(oCustomer.Currency)));

        aParts.push(_dashLine());
        aParts.push(_row(
            "Invoice Amount",
            _escapeHtml(FiCustomerReceiptFormatter.formatAmount(oCustomer.InvoiceAmount, sCurrency)),
            "amount-strong"
        ));
        aParts.push(_row(
            "Paid Amount",
            _escapeHtml(FiCustomerReceiptFormatter.formatAmount(oCustomer.PaidAmount, sCurrency))
        ));
        aParts.push(_row(
            "Open Amount",
            _escapeHtml(FiCustomerReceiptFormatter.formatAmount(oCustomer.OpenAmount, sCurrency)),
            "open-amount"
        ));
        aParts.push(_row(
            "Payment Rate",
            _escapeHtml(FiCustomerReceiptFormatter.formatRate(oCustomer.PaymentRate)),
            "rate"
        ));
        aParts.push(_row(
            "Open Rate",
            _escapeHtml(FiCustomerReceiptFormatter.formatRate(oCustomer.OpenRate))
        ));

        aParts.push(_dashLine());
        aParts.push(_row("Invoice Count", _escapeHtml(String(oCustomer.InvoiceCount || 0))));
        aParts.push(_row("Paid Count", _escapeHtml(String(oCustomer.PaidCount || 0))));
        aParts.push(_row("Open Count", _escapeHtml(String(oCustomer.OpenCount || 0))));

        aParts.push(_dashLine());
        aParts.push(_row(
            "Accounting Doc.",
            _escapeHtml(FiCustomerReceiptFormatter.formatOptionalText(oCustomer.AccountingDocument))
        ));
        aParts.push(_row(
            "Fiscal Year",
            _escapeHtml(FiCustomerReceiptFormatter.formatOptionalText(oCustomer.FiscalYear))
        ));
        aParts.push(_row(
            "Document Type",
            _escapeHtml(FiCustomerReceiptFormatter.formatOptionalText(oCustomer.DocumentType))
        ));
        aParts.push(_row(
            "Posting Date",
            _escapeHtml(FiCustomerReceiptFormatter.formatDate(oCustomer.PostingDate))
        ));
        aParts.push(_row(
            "Clearing Doc.",
            _escapeHtml(FiCustomerReceiptFormatter.formatOptionalText(oCustomer.ClearingDocument))
        ));
        aParts.push(_row(
            "Clearing Date",
            _escapeHtml(FiCustomerReceiptFormatter.formatDate(oCustomer.ClearingDate))
        ));

        aParts.push(_dashLine());
        aParts.push("<footer class=\"footer\">");
        aParts.push("<p class=\"footer-thanks\">Thank you</p>");
        aParts.push("<p class=\"footer-brand\">Uniqlo FI Receipt</p>");
        aParts.push("<p class=\"footer-note\">Generated from SAP FI Open/Cleared Customer Items</p>");
        aParts.push("</footer>");

        aParts.push("</article></div></body></html>");

        return aParts.join("");
    }

    return {
        printCustomerReceipt: function (oCustomer) {
            if (!oCustomer || !oCustomer.hasSelection) {
                return { ok: false, message: "\uC120\uD0DD\uB41C \uACE0\uAC1D \uC601\uC218\uC99D\uC774 \uC5C6\uC2B5\uB2C8\uB2E4." };
            }

            var sHtml = _buildPrintHtml(oCustomer);
            var oPrintWindow = window.open("", "_blank");

            if (!oPrintWindow) {
                return {
                    ok: false,
                    message: "\uD31D\uC5C5 \uCC28\uB2E8\uC774 \uCC28\uB2E8\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uBE0C\uB77C\uC6B0\uC800\uC5D0\uC11C \uD31D\uC5C5\uC744 \uD5C8\uC6A9\uD574 \uC8FC\uC138\uC694."
                };
            }

            oPrintWindow.document.open();
            oPrintWindow.document.write(sHtml);
            oPrintWindow.document.close();

            oPrintWindow.onload = function () {
                oPrintWindow.focus();
                oPrintWindow.print();
            };

            setTimeout(function () {
                if (oPrintWindow && !oPrintWindow.closed) {
                    oPrintWindow.focus();
                    oPrintWindow.print();
                }
            }, 400);

            return {
                ok: true,
                message: "\uC778\uC1C4 \uCC3D\uC5D0\uC11C PDF \uC800\uC7A5\uC744 \uC120\uD0DD\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4."
            };
        }
    };
});
