using ControlEscolar.Repostories;

namespace ControlEscolar.Services;

// Manda por Telegram las alertas que aún no se avisan. Sin token en appsettings.json no hace nada
// y las alertas quedan pendientes para cuando lo pongas.
public class TelegramService(EscolarRepository repo, IConfiguration config, HttpClient http, ILogger<TelegramService> log)
{
    public async Task AvisarPendientesAsync()
    {
        var token = config["Telegram:BotToken"];
        if (string.IsNullOrWhiteSpace(token)) return;
        var api = config["Telegram:ApiUrl"] ?? "https://api.telegram.org";
        try
        {
            foreach (var (id, chatId, texto) in await repo.AlertasPorAvisarAsync())
            {
                var r = await http.PostAsJsonAsync($"{api}/bot{token}/sendMessage", new { chat_id = chatId, text = texto });
                if (r.IsSuccessStatusCode) await repo.MarcarAvisadaAsync(id);
                else log.LogWarning("Telegram rechazó el aviso para {ChatId}: {Estado}", chatId, r.StatusCode);
            }
        }
        catch (Exception e) // sin internet: la lista ya se guardó, el aviso se reintenta en el siguiente guardado
        {
            log.LogWarning("No se pudo avisar por Telegram: {Error}", e.Message);
        }
    }
}
