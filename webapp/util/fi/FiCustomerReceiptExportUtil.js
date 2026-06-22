/**
 * FiCustomerReceiptExportUtil.js — Customer Receipt voucher export (Excel-compatible)
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

    function _cell(vValue) {
        return "<td>" + _escapeHtml(vValue === null || vValue === undefined ? "" : vValue) + "</td>";
    }

    function _buildFileName(sCustomer) {
        var sSafe = String(sCustomer || "CUSTOMER").replace(/[^\w\-]+/g, "_");
        var sDate = new Date().toISOString().slice(0, 10).replace(/-/g, "");

        return "FI_Customer_Receipt_" + sSafe + "_" + sDate + ".xls";
    }

    function _buildSummaryRows(oCustomer) {
        return [
            ["Company Code", oCustomer.CompanyCode],
            ["Customer", oCustomer.Customer],
            ["Customer Name", oCustomer.CustomerName],
            ["Status", FiCustomerReceiptFormatter.formatStatus(oCustomer.Status)],
            ["Currency", oCustomer.Currency],
            ["Invoice Amount", FiCustomerReceiptFormatter.formatAmount(oCustomer.InvoiceAmount, oCustomer.Currency)],
            ["Paid Amount", FiCustomerReceiptFormatter.formatAmount(oCustomer.PaidAmount, oCustomer.Currency)],
            ["Open Amount", FiCustomerReceiptFormatter.formatAmount(oCustomer.OpenAmount, oCustomer.Currency)],
            ["Payment Rate", FiCustomerReceiptFormatter.formatRate(oCustomer.PaymentRate)],
            ["Open Rate", FiCustomerReceiptFormatter.formatRate(oCustomer.OpenRate)],
            ["Invoice Count", oCustomer.InvoiceCount],
            ["Paid Count", oCustomer.PaidCount],
            ["Open Count", oCustomer.OpenCount],
            ["Accounting Doc.", FiCustomerReceiptFormatter.formatOptionalText(oCustomer.AccountingDocument)],
            ["Fiscal Year", FiCustomerReceiptFormatter.formatOptionalText(oCustomer.FiscalYear)],
            ["Document Type", FiCustomerReceiptFormatter.formatOptionalText(oCustomer.DocumentType)],
            ["Posting Date", FiCustomerReceiptFormatter.formatDate(oCustomer.PostingDate)],
            ["Clearing Doc.", FiCustomerReceiptFormatter.formatClearingDocument(
                oCustomer.ClearingDocument,
                oCustomer.clearingSameAsAccounting
            )],
            ["Clearing Date", FiCustomerReceiptFormatter.formatDate(oCustomer.ClearingDate)]
        ];
    }

    function _buildWorkbookHtml(oCustomer, aDetails) {
        var aSummary = _buildSummaryRows(oCustomer);
        var aHtml = [];
        var i;

        aHtml.push("<html xmlns:o=\"urn:schemas-microsoft-com:office:office\" xmlns:x=\"urn:schemas-microsoft-com:office:excel\">");
        aHtml.push("<head><meta charset=\"UTF-8\"></head><body>");
        aHtml.push("<h3>FI Customer Receipt Voucher</h3>");
        aHtml.push("<table border=\"1\" cellspacing=\"0\" cellpadding=\"4\">");
        aHtml.push("<tr><th>Field</th><th>Value</th></tr>");

        for (i = 0; i < aSummary.length; i++) {
            aHtml.push("<tr>" + _cell(aSummary[i][0]) + _cell(aSummary[i][1]) + "</tr>");
        }

        aHtml.push("</table>");
        aHtml.push("<br/>");
        aHtml.push("<h3>Accounting Document Details</h3>");
        aHtml.push("<table border=\"1\" cellspacing=\"0\" cellpadding=\"4\">");
        aHtml.push("<tr>");
        aHtml.push(_cell("Accounting Document"));
        aHtml.push(_cell("Fiscal Year"));
        aHtml.push(_cell("Item"));
        aHtml.push(_cell("Document Type"));
        aHtml.push(_cell("Posting Date"));
        aHtml.push(_cell("Amount"));
        aHtml.push(_cell("Currency"));
        aHtml.push(_cell("Clearing Document"));
        aHtml.push(_cell("Clearing Date"));
        aHtml.push(_cell("Receipt Status"));
        aHtml.push("</tr>");

        (aDetails || []).forEach(function (oRow) {
            aHtml.push("<tr>");
            aHtml.push(_cell(oRow.AccountingDocument));
            aHtml.push(_cell(oRow.FiscalYear));
            aHtml.push(_cell(oRow.AccountingDocumentItem));
            aHtml.push(_cell(oRow.DocumentType));
            aHtml.push(_cell(FiCustomerReceiptFormatter.formatDate(oRow.PostingDate)));
            aHtml.push(_cell(FiCustomerReceiptFormatter.formatAmount(oRow.Amount, oRow.Currency)));
            aHtml.push(_cell(oRow.Currency));
            aHtml.push(_cell(FiCustomerReceiptFormatter.formatOptionalText(oRow.ClearingDocument)));
            aHtml.push(_cell(FiCustomerReceiptFormatter.formatDate(oRow.ClearingDate)));
            aHtml.push(_cell(FiCustomerReceiptFormatter.formatStatus(oRow.ReceiptStatus)));
            aHtml.push("</tr>");
        });

        aHtml.push("</table></body></html>");

        return aHtml.join("");
    }

    return {
        exportCustomerReceipt: function (oCustomer, aDetails) {
            if (!oCustomer || !oCustomer.hasSelection) {
                return { ok: false, message: "\uC120\uD0DD\uB41C \uACE0\uAC1D \uC804\uD45C\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4." };
            }

            var sHtml = _buildWorkbookHtml(oCustomer, aDetails || []);
            var oBlob = new Blob(["\uFEFF" + sHtml], { type: "application/vnd.ms-excel;charset=utf-8;" });
            var oLink = document.createElement("a");

            oLink.href = URL.createObjectURL(oBlob);
            oLink.download = _buildFileName(oCustomer.Customer);
            oLink.click();
            URL.revokeObjectURL(oLink.href);

            return {
                ok: true,
                message: "\uC804\uD45C\uB97C \uC5D1\uC140 \uD30C\uC77C\uB85C \uB0B4\uC2B5\uB2C8\uB2E4.",
                rowCount: (aDetails || []).length
            };
        }
    };
});
