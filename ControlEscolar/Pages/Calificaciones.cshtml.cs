using System.Globalization;
using ControlEscolar.Models;
using ControlEscolar.Repostories;
using ControlEscolar.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace ControlEscolar.Pages;

public class CalificacionesModel(EscolarRepository repo, TelegramService telegram) : PageModel
{
    [BindProperty(SupportsGet = true)] public Guid? Grupo { get; set; }
    [BindProperty(SupportsGet = true)] public Guid? Materia { get; set; }
    [BindProperty(SupportsGet = true)] public int Parcial { get; set; } = 1;
    [BindProperty] public Dictionary<Guid, string?> Valores { get; set; } = [];

    public List<Grupo> Grupos { get; private set; } = [];
    public List<Materia> Materias { get; private set; } = [];
    public List<FilaCaptura> Filas { get; private set; } = [];
    public string? Error { get; private set; }

    async Task CargarAsync()
    {
        var u = User.Actual();
        Grupos = await repo.GruposAsync(u);
        Materias = await repo.MateriasAsync(u);
        Grupo ??= Grupos.FirstOrDefault()?.Id;
        Materia ??= Materias.FirstOrDefault()?.Id;
        Parcial = Math.Clamp(Parcial, 1, 3);
        if (Grupo is Guid g && Materia is Guid m)
            Filas = await repo.CapturaAsync(u, g, DateOnly.MinValue, m, Parcial);
    }

    public Task OnGetAsync() => CargarAsync();

    public async Task<IActionResult> OnPostAsync()
    {
        await CargarAsync();
        var filas = new List<(Guid, decimal)>();
        foreach (var f in Filas)
        {
            var texto = Valores.GetValueOrDefault(f.AlumnoId)?.Trim().Replace(',', '.');
            if (string.IsNullOrEmpty(texto)) continue; // en blanco = sin capturar
            if (!decimal.TryParse(texto, NumberStyles.Number, CultureInfo.InvariantCulture, out var v) || v < 0 || v > 10)
            {
                Error = $"La calificación de {f.Alumno} debe estar entre 0 y 10. No se guardó nada.";
                return Page();
            }
            filas.Add((f.AlumnoId, Math.Round(v, 2)));
        }
        if (filas.Count == 0)
        {
            Error = "Escribe al menos una calificación.";
            return Page();
        }
        await repo.GuardarCalificacionesAsync(User.Actual(), Materia!.Value, Parcial, filas);
        await telegram.AvisarPendientesAsync();
        TempData["Mensaje"] = $"Se guardaron {filas.Count} calificaciones del parcial {Parcial}.";
        return RedirectToPage(new { Grupo, Materia, Parcial });
    }
}
