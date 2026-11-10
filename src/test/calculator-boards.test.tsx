import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({ options }),
  useNavigate: () => vi.fn(),
  Link: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

import { Route } from "@/routes/index";

afterEach(cleanup);

describe("independent calculator boards", () => {
  it("keeps Refined figures out of Ball and Ball figures out of Refined", () => {
    const Calculator = Route.options.component as ComponentType;
    render(<Calculator />);

    fireEvent.change(screen.getByLabelText(/Top Weight/), { target: { value: "47.68" } });
    fireEvent.change(screen.getByLabelText(/Down \(Water\)/), { target: { value: "2.56" } });
    fireEvent.change(screen.getByLabelText(/Price \(23kt\)/), { target: { value: "11000" } });
    expect(screen.getByText("GH₵ 67,179.00")).toBeTruthy();

    fireEvent.click(screen.getByRole("radio", { name: "ball" }));
    expect((screen.getByLabelText(/Weight/) as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText(/Price/) as HTMLInputElement).value).toBe("");
    expect(screen.getByText("GH₵ 0.00")).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/Weight/), { target: { value: "12.20" } });
    fireEvent.change(screen.getByLabelText(/Price/), { target: { value: "11000" } });
    expect(screen.getByText("GH₵ 17,270.00")).toBeTruthy();

    fireEvent.click(screen.getByRole("radio", { name: "refined" }));
    expect((screen.getByLabelText(/Top Weight/) as HTMLInputElement).value).toBe("47.68");
    expect((screen.getByLabelText(/Down \(Water\)/) as HTMLInputElement).value).toBe("2.56");
    expect(screen.getByText("GH₵ 67,179.00")).toBeTruthy();

    fireEvent.click(screen.getByRole("radio", { name: "ball" }));
    expect((screen.getByLabelText(/Weight/) as HTMLInputElement).value).toBe("12.20");
    expect(screen.getByText("GH₵ 17,270.00")).toBeTruthy();
  });
});