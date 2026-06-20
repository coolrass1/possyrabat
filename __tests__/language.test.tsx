/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { LanguageProvider, useLanguage } from '@/app/components/LanguageProvider';

// A simple test component that consumes the language context
const TestComponent = () => {
  const { language, setLanguage, t } = useLanguage();
  return (
    <div>
      <span data-testid="lang">{language}</span>
      <span data-testid="title">{t('common.title')}</span>
      <span data-testid="nav-home">{t('nav.home')}</span>
      <span data-testid="rules-title">{t('rules.title')}</span>
      <button data-testid="toggle-fr" onClick={() => setLanguage('fr')}>FR</button>
      <button data-testid="toggle-en" onClick={() => setLanguage('en')}>EN</button>
    </div>
  );
};

describe('Language i18n Translation System', () => {
  beforeEach(() => {
    // Clear localStorage mock
    localStorage.clear();
  });

  it('provides default language and translates keys', () => {
    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );

    // Default language should be english
    expect(screen.getByTestId('lang').textContent).toBe('en');
    expect(screen.getByTestId('title').textContent).toBe('Possyrabat');
    expect(screen.getByTestId('nav-home').textContent).toBe('Home');
    expect(screen.getByTestId('rules-title').textContent).toBe('Rules & Member Agreement');
  });

  it('toggles language and updates all keys to French', () => {
    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );

    // Initial state: English
    expect(screen.getByTestId('nav-home').textContent).toBe('Home');
    expect(screen.getByTestId('rules-title').textContent).toBe('Rules & Member Agreement');

    const btnFr = screen.getByTestId('toggle-fr');
    act(() => {
      btnFr.click();
    });

    expect(screen.getByTestId('lang').textContent).toBe('fr');
    // Nav key translates to French
    expect(screen.getByTestId('nav-home').textContent).toBe('Accueil');
    // Rules key translates to French too
    expect(screen.getByTestId('rules-title').textContent).toBe('Statuts & Règlements de Litiges');
  });

  it('persists selected language to localStorage', () => {
    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );

    const btnFr = screen.getByTestId('toggle-fr');
    act(() => {
      btnFr.click();
    });

    expect(localStorage.getItem('possyrabat_lang')).toBe('fr');
  });
});
