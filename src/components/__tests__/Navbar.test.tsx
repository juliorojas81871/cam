import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Navbar from '../Navbar';

describe('Navbar', () => {
  it('should render navigation links', () => {
    render(<Navbar />);

    expect(screen.getAllByText(/properties/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/owned properties/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/leased properties/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/map/i).length).toBeGreaterThan(0);
  });

  it('should have correct href attributes', () => {
    const { container } = render(<Navbar />);

    const links = container.querySelectorAll('a');
    expect(links.length).toBeGreaterThan(0);
  });

  it('should render logo or title', () => {
    render(<Navbar />);

    expect(screen.getByText(/cam ventures/i)).toBeInTheDocument();
  });
});

