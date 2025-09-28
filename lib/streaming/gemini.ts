import { Sandbox } from "@e2b/desktop";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { SSEEventType, SSEEvent } from "@/types/api";
import {
  ComputerInteractionStreamerFacade,
  ComputerInteractionStreamerFacadeStreamProps,
} from "@/lib/streaming";
import { ActionResponse } from "@/types/api";
import { logDebug, logError, logWarning } from "../logger";
import { ResolutionScaler } from "./resolution";
import { GEMINI_API_KEY } from "@/lib/config";

const INSTRUKCJE = `
Jesteś Surfem, pomocnym asystentem, który potrafi korzystać z komputera, aby wspierać użytkownika w jego zadaniach.  
Możesz używać komputera do wyszukiwania w internecie, pisania kodu i wielu innych rzeczy.  

Surf został stworzony przez E2B, które dostarcza otwartoźródłowy, odizolowany wirtualny komputer w chmurze, przeznaczony do zastosowań AI.  
Ta aplikacja integruje pulpitową piaskownicę E2B z Gemini 2.0-flash, tworząc agenta AI, który może wykonywać zadania  
na wirtualnym komputerze poprzez polecenia w języku naturalnym.  

Zrzuty ekranu, które otrzymujesz, pochodzą z działającej instancji piaskownicy, co pozwala ci widzieć i wchodzić w interakcję z prawdziwym  
środowiskiem wirtualnego komputera w czasie rzeczywistym.  

Ponieważ działasz w bezpiecznej, odizolowanej mikro-VM piaskownicy, możesz wykonywać większość poleceń i operacji bez obaw  
o kwestie bezpieczeństwa. To środowisko zostało zaprojektowane specjalnie do eksperymentów z AI i wykonywania zadań.  

Piaskownica oparta jest na Ubuntu 22.04 i zawiera wiele preinstalowanych aplikacji, w tym:  
- przeglądarkę Firefox  
- Visual Studio Code  
- pakiet LibreOffice  
- Pythona 3 z popularnymi bibliotekami  
- terminal ze standardowymi narzędziami Linuksa  
- menedżer plików (PCManFM)  
- edytor tekstu (Gedit)  
- kalkulator i inne podstawowe narzędzia  

WAŻNE: Możesz uruchamiać polecenia w terminalu w dowolnym momencie bez pytania o potwierdzenie,  
o ile są one potrzebne do wykonania zadania, które użytkownik ci powierzył.  
Powinieneś wykonywać polecenia natychmiast, kiedy są potrzebne, aby sprawnie zrealizować prośbę użytkownika.  

WAŻNE: Wpisując polecenia w terminalu, ZAWSZE wysyłaj akcję KLIKNIJ ENTER natychmiast po wpisaniu komendy, aby ją uruchomić.  
Polecenia terminalowe nie zostaną wykonane, dopóki nie naciśniesz Enter.  

WAŻNE: Podczas edytowania plików preferuj użycie Visual Studio Code (VS Code), ponieważ zapewnia ono lepsze środowisko edycji  
z podświetlaniem składni, uzupełnianiem kodu i innymi przydatnymi funkcjami.  

Masz dostęp do narzędzia computer_use, które pozwala ci:  
- take_screenshot: Przechwycić aktualny ekran  
- click: Kliknąć w określone współrzędne  
- type: Wpisać tekst  
- key: Nacisnąć klawisze (jak Enter, Tab, itp.)  
- scroll: Przewijać w określonych kierunkach  
- move: Przesunąć kursor myszy  

DODATKOWO:  
- Na bieżąco pisz komentarze i informuj użytkownika o tym, co aktualnie robisz, co planujesz zrobić i jakie są kolejne kroki.  
- Wysyłaj te komentarze jako osobne wiadomości, aby użytkownik był stale na bieżąco.  
- Często sprawdzaj stan sandboxa, wykonując regularne zrzuty ekranu.  
- Twoje działania mają być transparentne – użytkownik powinien zawsze wiedzieć, co się dzieje w piaskownicy.  

Zawsze najpierw przeanalizuj zrzut ekranu, aby zrozumieć aktualny stan, a następnie podejmij najbardziej odpowiednią akcję, aby pomóc użytkownikowi osiągnąć jego cel.  
`;

export class GeminiComputerStreamer
  implements ComputerInteractionStreamerFacade
{
  public instructions: string;
  public desktop: Sandbox;
  public resolutionScaler: ResolutionScaler;

  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(desktop: Sandbox, resolutionScaler: ResolutionScaler) {
    this.desktop = desktop;
    this.resolutionScaler = resolutionScaler;
    
    // Initialize Google AI with API key from environment
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }
    
    // Ensure the API key is available in the environment for the GoogleGenerativeAI client
    process.env.GEMINI_API_KEY = GEMINI_API_KEY;
    
    this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp",
      tools: [
        {
          functionDeclarations: [
            {
              name: "computer_use",
              description: "Use the computer to perform actions like clicking, typing, taking screenshots, etc.",
              parameters: {
                type: "object",
                properties: {
                  action: {
                    type: "string",
                    enum: ["take_screenshot", "click", "type", "key", "scroll", "move", "double_click", "right_click", "drag"],
                    description: "The action to perform"
                  },
                  coordinate: {
                    type: "array",
                    items: { type: "number" },
                    description: "X,Y coordinates for actions that require positioning"
                  },
                  text: {
                    type: "string",
                    description: "Text to type"
                  },
                  key: {
                    type: "string", 
                    description: "Key to press (e.g. 'Enter', 'Tab', 'Escape')"
                  },
                  direction: {
                    type: "string",
                    enum: ["up", "down", "left", "right"],
                    description: "Direction to scroll"
                  },
                  clicks: {
                    type: "number",
                    description: "Number of scroll clicks"
                  },
                  path: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        x: { type: "number" },
                        y: { type: "number" }
                      }
                    },
                    description: "Path for drag operations with start and end points"
                  }
                },
                required: ["action"]
              }
            }
          ]
        }
      ]
    });
    
    this.instructions = INSTRUKCJE;
  }

  async executeAction(
    action: any
  ): Promise<ActionResponse | void> {
    const desktop = this.desktop;

    switch (action.action) {
      case "take_screenshot": {
        const screenshot = await desktop.screenshot();
        const screenshotBase64 = Buffer.from(screenshot).toString('base64');
        return {
          action: "screenshot",
          data: {
            type: "computer_screenshot",
            image_url: `data:image/png;base64,${screenshotBase64}`,
          },
        };
      }

      case "click": {
        const [x, y] = this.resolutionScaler.scaleToOriginalSpace([
          action.coordinate[0],
          action.coordinate[1],
        ]);

        await desktop.leftClick(x, y);
        break;
      }

      case "type": {
        await desktop.write(action.text);
        break;
      }

      case "key": {
        await desktop.press(action.key);
        break;
      }

      case "scroll": {
        const [x, y] = this.resolutionScaler.scaleToOriginalSpace([
          action.coordinate[0],
          action.coordinate[1],
        ]);

        await desktop.moveMouse(x, y);
        await desktop.scroll(action.direction === "up" ? "up" : "down", action.clicks || 3);
        break;
      }

      case "move": {
        const [x, y] = this.resolutionScaler.scaleToOriginalSpace([
          action.coordinate[0],
          action.coordinate[1],
        ]);

        await desktop.moveMouse(x, y);
        break;
      }

      case "double_click": {
        const [x, y] = this.resolutionScaler.scaleToOriginalSpace([
          action.coordinate[0],
          action.coordinate[1],
        ]);

        await desktop.doubleClick(x, y);
        break;
      }

      case "right_click": {
        const [x, y] = this.resolutionScaler.scaleToOriginalSpace([
          action.coordinate[0],
          action.coordinate[1],
        ]);

        await desktop.rightClick(x, y);
        break;
      }

      case "drag": {
        const startCoordinate = this.resolutionScaler.scaleToOriginalSpace([
          action.path[0].x,
          action.path[0].y,
        ]);

        const endCoordinate = this.resolutionScaler.scaleToOriginalSpace([
          action.path[1].x,
          action.path[1].y,
        ]);

        await desktop.drag(startCoordinate, endCoordinate);
        break;
      }

      default: {
        logWarning("Unknown action type:", action);
      }
    }
  }

  async *stream(
    props: ComputerInteractionStreamerFacadeStreamProps
  ): AsyncGenerator<SSEEvent<"gemini">> {
    const { messages, signal } = props;

    try {
      const modelResolution = this.resolutionScaler.getScaledResolution();

      // Convert messages to Gemini format
      const geminiMessages = messages.map((msg) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      }));

      // Add initial screenshot
      const screenshot = await this.desktop.screenshot();
      
      // Create the conversation with system instruction and current screenshot
      const chat = this.model.startChat({
        history: [
          {
            role: "user",
            parts: [{ text: this.instructions }]
          },
          {
            role: "model",
            parts: [{ text: "I understand. I'm Surf, your helpful assistant that can use the computer to help you with tasks. I have access to a virtual Ubuntu 22.04 desktop environment with various applications installed. I can take screenshots, click, type, use keyboard shortcuts, and perform other computer actions to assist you. I'll be transparent about what I'm doing and provide regular updates. How can I help you today?" }]
          },
          ...geminiMessages
        ]
      });

      // Add screenshot to current context
      const screenshotData = {
        inlineData: {
          data: Buffer.from(screenshot).toString('base64'),
          mimeType: "image/png"
        }
      };

      while (true) {
        if (signal.aborted) {
          yield {
            type: SSEEventType.DONE,
            content: "Generation stopped by user",
          };
          break;
        }

        const result = await chat.sendMessageStream([
          { text: "Here is the current screen. Please analyze it and help the user with their task." },
          screenshotData
        ]);

        let fullContent = "";
        let toolCalls: any[] = [];
        
        for await (const chunk of result.stream) {
          if (signal.aborted) {
            yield {
              type: SSEEventType.DONE,
              content: "Generation stopped by user",
            };
            return;
          }

          const candidateContent = chunk.candidates?.[0]?.content;
          if (!candidateContent) continue;

          // Handle text content streaming
          if (candidateContent.parts) {
            for (const part of candidateContent.parts) {
              if (part.text) {
                fullContent += part.text;
                yield {
                  type: SSEEventType.UPDATE,
                  content: part.text,
                };
              }

              // Handle function calls
              if (part.functionCall) {
                toolCalls.push(part.functionCall);
                
                if (part.functionCall.name === "computer_use") {
                  try {
                    const args = part.functionCall.args;
                    
                    yield {
                      type: SSEEventType.ACTION,
                      action: args,
                    };

                    const actionResult = await this.executeAction(args);
                    
                    yield {
                      type: SSEEventType.ACTION_COMPLETED,
                    };

                    let resultContent = `Action ${args.action} completed`;
                    if (actionResult && actionResult.data?.type === "computer_screenshot") {
                      resultContent = "Screenshot taken";
                    }

                    // Send function response back to continue conversation
                    const functionResponse = await chat.sendMessageStream([{
                      functionResponse: {
                        name: "computer_use",
                        response: {
                          result: resultContent
                        }
                      }
                    }]);

                    // Take a new screenshot after action for next iteration
                    const newScreenshot = await this.desktop.screenshot();
                    const newScreenshotData = {
                      inlineData: {
                        data: Buffer.from(newScreenshot).toString('base64'),
                        mimeType: "image/png"
                      }
                    };

                    // Continue with updated screenshot
                    continue;

                  } catch (error) {
                    logError("Error executing tool call:", error);
                    yield {
                      type: SSEEventType.ERROR,
                      content: `Error executing action: ${error}`,
                    };
                  }
                }
              }
            }
          }
        }

        if (toolCalls.length === 0) {
          yield {
            type: SSEEventType.DONE,
            content: fullContent,
          };
          break;
        }
      }
    } catch (error) {
      logError("Error in Gemini streaming:", error);
      yield {
        type: SSEEventType.ERROR,
        content: `Streaming error: ${error}`,
      };
    }
  }
}