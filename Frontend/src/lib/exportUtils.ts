/**
 * Utility to export JSON data to CSV format and trigger a browser download.
 * This satisfies the "Excel etc download" requirement by providing a format 
 * natively supported by Excel.
 */
export function exportToCSV(data: any[], fileName: string) {
  if (!data || data.length === 0) return;

  // Extract headers
  const headers = Object.keys(data[0]);
  
  // Create CSV rows
  const csvRows = [];
  
  // Add headers as the first row
  csvRows.push(headers.join(','));
  
  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header];
      const escaped = ('' + val).replace(/"/g, '""'); // Escape double quotes
      return `"${escaped}"`; // Wrap in quotes to handle commas within values
    });
    csvRows.push(values.join(','));
  }
  
  // Combine rows into a single string
  const csvString = csvRows.join('\n');
  
  // Create a blob and trigger download
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${fileName}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
