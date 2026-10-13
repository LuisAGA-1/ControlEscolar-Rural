using ControlEscolar.Models;
using ControlEscolar.Repostories;
using ControlEscolar.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace ControlEscolar.Pages;

public class AsistenciaModel(EscolarRepository repo, TelegramService telegram) : PageModel
{
    [BindProperty(SupportsGet = true)] public Guid? Grupo { get; set; }
    [BindProperty(SupportsGet = true)] public DateOnly? Fecha { get; set; }
    [BindProperty] public Dictionary<Guid, string> Estados { get; set; } = [];

    public List<Grupo> Grupos { get; private set; } = [];
    public List<FilaCaptura> Filas { get; private set; } = [];
    public string? Error { get; private set; }
    public DateOnly Hoy => DateOnly.FromDateTime(DateTime.Now);

    async Task CargarAsync()
    {
        var u = User.Actual();
        Grupos = await repo.GruposAsync(u);
        Grupo ??= Grupos.FirstOrDefault()?.Id;
        Fecha ??= Hoy;
        if (Grupo is Guid g) Filas = await repo.CapturaAsync(u, g, Fecha.Value, Guid.Empty, 0);
    }

    public Task OnGetAsync() => CargarAsync();

    public async Task<IActionResult> OnPostAsync()
    {
        await CargarAsync();
        if (Fecha > Hoy) Error = "No se puede pasar lista de una fecha futura.";
        var validos = Ui.Estados.Select(e => e.Valor).ToHashSet();
        // Solo se aceptan alumnos del grupo elegido (y el grupo ya se filtró por usuario).
        var filas = Filas.Where(f => Estados.TryGetValue(f.AlumnoId, out var e) && validos.Contains(e))
                         .Select(f => (f.AlumnoId, Estados[f.AlumnoId])).ToList();
        if (filas.Count == 0) Error ??= "Marca la asistencia de al menos un alumno.";
        if (Error is not null) return Page();

        await repo.GuardarAsistenciaAsync(User.Actual(), Fecha!.Value, filas);
        await telegram.AvisarPendientesAsync();
        TempData["Mensaje"] = $"Lista guardada: {filas.Count} alumnos el {Fecha:dd/MM/yyyy}.";
        return RedirectToPage(new { Grupo, Fecha = Fecha?.ToString("yyyy-MM-dd") });
    }
}
