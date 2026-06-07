import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({ name: 'htmlNewlines', standalone: true })
export class HtmlNewlinesPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}
  transform(value: string): SafeHtml {
    if (!value) return '';
    const html = value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}

@Pipe({ name: 'modelAnswerHtml', standalone: true })
export class ModelAnswerHtmlPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}
  transform(value: string): SafeHtml {
    if (!value) return '';
    const html = value
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const clean = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        if (clean.startsWith('•') || clean.startsWith('-') || clean.startsWith('*')) {
          const text = clean.replace(/^[•\-\*]\s*/, '');
          return `<div style="display:flex;gap:8px;padding:4px 0;align-items:flex-start">
            <span style="color:var(--green);font-size:16px;flex-shrink:0;line-height:1.5">•</span>
            <span style="line-height:1.6">${text}</span>
          </div>`;
        }
        return `<p style="margin:6px 0;line-height:1.6">${clean}</p>`;
      })
      .join('');
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
