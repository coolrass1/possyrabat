'use server';

import { randomUUID } from 'crypto';
import db from './db';
import { Statement, EmailLog } from './types';
import { getMemberById } from './auth';
import { sendEmail } from './email';

export async function generateStatement(year: number, month: number): Promise<Statement> {
  const id = randomUUID();
  const now = Date.now();

  // Calculate month boundaries
  const monthStart = new Date(year, month, 1).getTime();
  const monthEnd = new Date(year, month + 1, 1).getTime();

  // Get contributions for the month
  const contributions = db
    .prepare(
      'SELECT member_id, amount FROM contributions WHERE date >= ? AND date < ? AND deleted_at IS NULL'
    )
    .all(monthStart, monthEnd) as any[];

  const totalIn = contributions.reduce((sum, c) => sum + c.amount, 0);

  // Calculate contributors list
  const contributorsMap: Record<string, number> = {};
  for (const contrib of contributions) {
    if (!contributorsMap[contrib.member_id]) {
      contributorsMap[contrib.member_id] = 0;
    }
    contributorsMap[contrib.member_id] += contrib.amount;
  }
  const contributors = Object.entries(contributorsMap).map(([member_id, amount]) => ({
    member_id,
    amount,
  }));

  // Get expenses for the month by aim
  const expenses = db
    .prepare('SELECT aim, amount FROM expenses WHERE date >= ? AND date < ? AND deleted_at IS NULL')
    .all(monthStart, monthEnd) as any[];

  const expensesByAim = {
    court_case: 0,
    construction: 0,
    security: 0,
    general: 0,
  };

  for (const expense of expenses) {
    if (expensesByAim.hasOwnProperty(expense.aim)) {
      expensesByAim[expense.aim as keyof typeof expensesByAim] += expense.amount;
    }
  }

  const totalOut = expenses.reduce((sum, e) => sum + e.amount, 0);
  const balance = totalIn - totalOut;

  // Generate HTML content
  const htmlContent = generateStatementHTML(year, month, totalIn, totalOut, balance, expensesByAim, contributors);

  // Store in database
  db.prepare(`
    INSERT INTO statements (
      id, year, month, total_in, total_out, balance, expenses_by_aim, contributors, html_content, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    year,
    month,
    totalIn,
    totalOut,
    balance,
    JSON.stringify(expensesByAim),
    JSON.stringify(contributors),
    htmlContent,
    now
  );

  return {
    id,
    year,
    month,
    total_in: totalIn,
    total_out: totalOut,
    balance,
    expenses_by_aim: expensesByAim,
    contributors,
    html_content: htmlContent,
    created_at: now,
  };
}

export async function sendStatementEmail(memberId: string, statement: Statement): Promise<EmailLog> {
  const member = getMemberById(memberId);
  if (!member) {
    throw new Error('Member not found');
  }

  const monthName = new Date(statement.year, statement.month).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return sendEmail({
    to: member.email,
    subject: `Your ${monthName} Statement`,
    body: statement.html_content,
  });
}

function generateStatementHTML(
  year: number,
  month: number,
  totalIn: number,
  totalOut: number,
  balance: number,
  expensesByAim: Record<string, number>,
  contributors: Array<{ member_id: string; amount: number }>
): string {
  const monthName = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; color: #333; }
    .header { background: #16291F; color: #F3ECDD; padding: 20px; text-align: center; }
    .section { margin: 20px; }
    .summary { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin: 20px 0; }
    .card { background: #F3ECDD; padding: 15px; border-left: 4px solid #7C9A5E; }
    .amount { font-size: 24px; font-weight: bold; color: #16291F; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #E8DCC8; padding: 10px; text-align: left; font-weight: bold; }
    td { padding: 10px; border-bottom: 1px solid #E8DCC8; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Monthly Statement</h1>
    <p>${monthName}</p>
  </div>

  <div class="section">
    <h2>Summary</h2>
    <div class="summary">
      <div class="card">
        <p>Total In</p>
        <div class="amount">€${totalIn.toLocaleString()}</div>
      </div>
      <div class="card">
        <p>Total Out</p>
        <div class="amount">€${totalOut.toLocaleString()}</div>
      </div>
      <div class="card">
        <p>Balance</p>
        <div class="amount">€${balance.toLocaleString()}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Spending by Aim</h2>
    <table>
      <thead>
        <tr>
          <th>Aim</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Court Case</td>
          <td>€${expensesByAim.court_case.toLocaleString()}</td>
        </tr>
        <tr>
          <td>Construction</td>
          <td>€${expensesByAim.construction.toLocaleString()}</td>
        </tr>
        <tr>
          <td>Security</td>
          <td>€${expensesByAim.security.toLocaleString()}</td>
        </tr>
        <tr>
          <td>General</td>
          <td>€${expensesByAim.general.toLocaleString()}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>Contributors</h2>
    <table>
      <thead>
        <tr>
          <th>Member ID</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        ${contributors.map((c) => `<tr><td>${c.member_id}</td><td>€${c.amount.toLocaleString()}</td></tr>`).join('')}
      </tbody>
    </table>
  </div>
</body>
</html>
  `.trim();
}
