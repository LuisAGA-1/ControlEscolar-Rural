using Microsoft.AspNetCore.Mvc.RazorPages;
using ControlEscolar.Data;

namespace ControlEscolar.Pages;

public class ConexionModel(IWebHostEnvironment env) : PageModel
{
    public string Mensaje { get; set; } = string.Empty;

    public async Task OnGetAsync()
    {
        try
        {
            using var connection = DatabaseConnection.CreateConnection();

            await connection.OpenAsync();

            Mensaje = "Conexión con PostgreSQL exitosa.";
        }
        catch (Exception ex)
        {
            // En internet no se muestra el detalle (puede traer el servidor o el usuario de la base).
            Mensaje = env.IsDevelopment() ? $"Error de conexión: {ex.Message}" : "Error de conexión con la base de datos.";
        }
    }
}