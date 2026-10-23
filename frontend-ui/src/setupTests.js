// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

let previewUrlCounter = 0;
URL.createObjectURL = jest.fn(() => `blob:test-preview-${previewUrlCounter++}`);
URL.revokeObjectURL = jest.fn();
