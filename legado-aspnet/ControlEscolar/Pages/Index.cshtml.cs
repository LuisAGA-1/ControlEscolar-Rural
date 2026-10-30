using ControlEscolar.Models;
using ControlEscolar.Repostories;
using ControlEscolar.Services;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace ControlEscolar.Pages;

public class IndexModel(EscolarRepository repo) : PageModel
{
    public Resumen Resumen { get; private set; } = null!;
    public List<Alerta> Alertas { get; private set; } = [];
    public List<ClaseHorario> ClasesHoy { get; private set; } = [];
    public List<Grupo> Grupos { get; private set; } = [];
    public List<(string Estado, long Alumnos)> EstadosHoy { get; private set; } = [];
    public List<(string Materia, decimal Promedio)> Promedios { get; private set; } = [];

    public async Task OnGetAsync()
    {
        var u = User.Actual();
        Resumen = await repo.ResumenAsync(u);
        Alertas = await repo.AlertasAsync(u, incluirAtendidas: false, limite: 5);
        if (u.Rol == "docente") ClasesHoy = await repo.HorarioAsync(u, Ui.DiaDeHoy);
        Grupos = await repo.GruposAsync(u);
        EstadosHoy = await repo.EstadosHoyAsync(u);
        Promedios = await repo.PromediosPorMateriaAsync(u);
    }
}
